/*
Grays out or [whatever the opposite of graying out is called] the option
field.
*/
function ghost(isDeactivated) {
    options.style.color = isDeactivated ? 'graytext' : 'black';
                                                // The label color.
    options.frequency.disabled = isDeactivated; // The control manipulability.
}

var restore_options = function() {
    // Initialize the option controls.
    options.isActivated.checked = JSON.parse(localStorage.isActivated);
                                            // The display activation.
    options.frequency.value = localStorage.frequency;
                                            // The display frequency, in minutes.
    options.timeOut.value = localStorage.timeOut;
                                            // The display notification timeOut, in seconds.
    options.login.value = localStorage.login; // The user's login.
    options.hostname.value = localStorage.hostname; // The hostname.
    options.token.value = localStorage.token; // The user's token.
    options.showActions.checked = JSON.parse(localStorage.showActions);
                                            // Show user's actions.

    if (!options.isActivated.checked) { ghost(true); }

    // Set the display activation and frequency.
    options.isActivated.onchange = function() {
        localStorage.isActivated = options.isActivated.checked;
        ghost(!options.isActivated.checked);
    };

    options.frequency.onchange = function() {
        localStorage.frequency = options.frequency.value;
    };

    options.timeOut.onchange = function() {
        localStorage.timeOut = options.timeOut.value;
    };

    options.login.onchange = function() {
        localStorage.login = options.login.value;
    };

    options.hostname.onchange = function() {
        localStorage.hostname = options.hostname.value;
    };

    options.token.onchange = function() {
        localStorage.token = options.token.value;
    };

    options.showActions.onchange = function() {
        localStorage.showActions = options.showActions.checked;
    };
};

document.addEventListener('DOMContentLoaded', restore_options);
