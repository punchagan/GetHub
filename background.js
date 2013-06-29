//A background page that manages notifications for GetHub.
//
//Copyright (C) 2011 Puneeth Chaganti <punchagan+gethub@gmail.com>
//Copyright (C) 2011 Thomas Stephen Lee <lee.iitb@gmail.com>
//
//This file is part of GetHub.
//
//GetHub is free software: you can redistribute it and/or modify it
//under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.
//
//GetHub is distributed in the hope that it will be useful, but
//WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
//General Public License for more details.
//
//You should have received a copy of the GNU General Public License
//along with GetHub.  If not, see <http://www.gnu.org/licenses/>.
//
//A portion of the code in this file is based on sample extensions
//for chromium, news_a11y, available at
//http://src.chromium.org/viewvc/chrome/trunk/src/chrome/common/extensions/docs/examples/extensions/news_a11y/
//and notifications, available at
//http://src.chromium.org/viewvc/chrome/trunk/src/chrome/common/extensions/docs/examples/api/notifications/
//whose license is available at
//http://code.google.com/google_bsd_license.html

'use strict';

/*
Displays a notification with the current time. Requires "notifications"
permission in the manifest file (or calling
"webkitNotifications.requestPermission" beforehand).
*/
var show = function (title, desc, link, image_url) {
    image_url = image_url || "octocat-chrome.png"
    var notification = webkitNotifications.createNotification(
        image_url,
        title,
        desc
    );
    if (link == undefined) {
        link = 'https://github.com/'
    }
    notification.onclick = function () {
        chrome.tabs.create({url: link});
        notification.cancel();
    };
    notification.ondisplay = function () {
        setTimeout(function () { notification.cancel() }, localStorage.timeOut * 1000);
    };
    notification.show();
}


// The maximum number of feed items to show in the preview.
var maxFeedItems = 999;

var initialize = function(){
    setup_alarm();
    fetch_updates();
    chrome.alarms.onAlarm.addListener(function(alarm){
        console.log('Some alarm went off!');
        if (alarm && alarm.name=='refresh') {
            fetch_updates();
        }
    });
};

// Sets-up the alarm that triggers the periodic check for updates
var setup_alarm = function(){
    var delay = parseFloat(localStorage.frequency) || 10;
    chrome.alarms.create('refresh', {periodInMinutes: delay});
};

// Fetches the data from GitHub
var fetch_updates = function(){

    var status_dict = {'private': false, 'actor': !JSON.parse(localStorage.showActions)};
    var entries = [];

    var feed_urls = [localStorage.hostname + localStorage.login + '.private.atom?token=' + localStorage.token];
    // If user's actions are not required, do not add to list of urls to check
    if (!status_dict.actor) {
        feed_urls.push(localStorage.hostname + localStorage.login + '.private.actor.atom?token=' + localStorage.token)
    };

    var url;
    while (url = feed_urls.shift()) {
        var req = new XMLHttpRequest();
        req.onload = function(response){
            var doc = handle_response(response);
            if (doc) {get_entries(doc, entries, status_dict)}
        };
        req.onerror = handle_errors;
        req.open("GET", url, true);
        req.send(null);
    };

};

var get_entries = function(doc, entries, status_dict) {
    console.log(doc);
    var id = doc.getElementsByTagName('id')[0], type = id.textContent.split(localStorage.login + '.')[1];
    status_dict[type] = true;

    var new_entries = doc.getElementsByTagName('entry');

    var index = entries.length;
    for (var i = 0; i < new_entries.length; i++)
        entries[index++] = new_entries[i];

    console.log(entries, entries.length);
    show_updates(entries, status_dict);
};

// Handles errors during the XMLHttpRequest.
var handle_errors = function() {
    console.log('Failed to fetch RSS feed.');
}

// Handles parsing the feed data we got back from XMLHttpRequest.
var handle_response = function (response) {
    var req = response.target,  doc = req.responseXML;
    if (!doc) {
        if (req.status == 404 || req.status == 401) {
            show('Error', "Didn't get a feed. Did you set a valid username/token?");
        } else {
            console.log('Bad Bad Donut.');
        }
    }
    return doc;
}

// Shows the notifications for new updates, given a feed of actions
var show_updates = function (entries, status_dict) {

    for (var key in status_dict)
        if (!status_dict[key]) return;

    if (localStorage.lastPublished == '') {
        var lastDate = undefined;
    }
    else {
        var lastDate = new Date(localStorage.lastPublished);
    }

    // Sort the entries;
    entries.sort(sortEntries);

    var count = Math.min(entries.length, maxFeedItems);
    // For each entry
    for (var i = 0; i < count; i++) {
        var item = entries[i];

        // Grab the publish date for the feed item.
        var itemDate = new getItemDate(item)

        // Check if the item is newer; if not, return!
        if (lastDate != undefined && itemDate <= lastDate) {
            return;
        };

        // Grab the title for the feed item.
        var itemTitle = item.getElementsByTagName('title')[0];
        var userUrl = item.getElementsByTagName('thumbnail')[0].getAttribute('url');
        itemTitle = itemTitle.textContent;
        var userRegex = new RegExp('^' + localStorage.login + '\\s|\\s' +
                                   localStorage.login + '\\s|\\s' +
                                   localStorage.login + '$', 'g')

        itemTitle = itemTitle.replace(userRegex, " you "); // Replace quotes

        // Grab the link
        var itemLink = item.getElementsByTagName('link')[0];
        itemLink = itemLink.getAttribute('href');

        // Grab the description.
        var itemDesc = item.getElementsByTagName('content')[0];
        itemDesc = itemDesc.textContent;

        itemDesc = itemDesc.replace(/<blockquote(.|\s)*?>/g, " -- "); // Replace blockquote with dash
        itemDesc = itemDesc.replace(/<\/blockquote>/g, " || "); // Replace /blockquote with ;;
        itemDesc = itemDesc.replace(/(<br>\s*)+/g, "; "); // Strip out all other tags
        itemDesc = itemDesc.replace(/<.*?>/g, ""); // Strip out all other tags
        itemDesc = itemDesc.replace(/&#47;/g, " "); // Strip out &#47;
        itemDesc = itemDesc.replace(/\s+/g, " "); // Replace multiple spaces with one
        itemDesc = itemDesc.replace(/(^\s*--\s*|\s*\|\|\s*$)/g, " "); // Strip dashes
        itemDesc = itemDesc.replace(/&quot;/g, "'"); // Replace quotes
        itemDesc = itemDesc.replace(userRegex, " you "); // Replace username

        // Grab the event type.
        var itemEvent = item.getElementsByTagName('id')[0];
        itemEvent = itemEvent.textContent.replace('/',':')
        itemEvent = itemEvent.split(':')[2]

        // All events are
        // CommitCommentEvent, CreateEvent, FollowEvent, ForkEvent,
        // GollumEvent, GistEvent, IssuesEvent, PullRequestEvent,
        // PushEvent, WatchEvent

        var events = ["CommitCommentEvent", "CreateEvent", "FollowEvent",
                      "GistEvent", "IssuesEvent", "PullRequestEvent",
                      "PushEvent", "WatchEvent"]

        if ( events.indexOf(itemEvent)>=0 ) {
            var itemText = itemDesc;
        } else {
            itemText = itemDate.toLocaleString();
        }

        // Show a desktop notification.

        if (lastDate == undefined) {
            show(itemTitle, itemText , itemLink, userUrl);
            localStorage.lastPublished = itemDate; // Date
            return  // Return after showing the first item.
        };

        show(itemTitle, itemText, itemLink, userUrl);

        if (i==0) {
            localStorage.lastPublished = itemDate; // Save latest date
        };

    }
};

// Initialization on install
// Also could add code, that runs on updates.
chrome.runtime.onInstalled.addListener(
    function(details) {
        if (details.reason === 'install') {
            if (!webkitNotifications) {
                // Show a new tab with an error message.
                chrome.tabs.create({url: 'error.html'});
                return;
            }
            // Initialize the required values
            localStorage.isActivated = true;   // The display activation.
            localStorage.frequency = 5;        // The display frequency, in minutes.
            localStorage.timeOut = 5;        // The display notification timeOut, in seconds
            localStorage.isInitialized = true; // The option initialization.
            localStorage.token = ''; // The initialization.
            localStorage.login = ''; // The initialization.
            localStorage.hostname = 'https://github.com/'
            localStorage.lastPublished = ''; // Intialize
            localStorage.showActions = true;   // The initialization.
            show('GetHub','Installed! || Set username and token');
            chrome.tabs.create({url: 'options.html'}); // Open options after install
        }
        // Initialize alarm and fetch updates
        initialize();
    }
);

var getItemDate = function (item) {
    var itemPublished = item.getElementsByTagName('published')[0];
    itemPublished = itemPublished.textContent;

    var itemDate = new Date(itemPublished)
    return itemDate
};

var sortEntries = function (a, b){
    return getItemDate(b) - getItemDate(a)
};
