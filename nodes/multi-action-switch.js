module.exports = function(RED) {
    function MultiActionSwitchNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        // Retrieve node configuration from the editor
        const TRIGGER_VALUE = config.triggerValue || "true";
        const DOUBLECLICK_TIME = parseInt(config.doubleClickTime || "400");
        const LONGPRESS_TIME = parseInt(config.longPressTime || "700");
        const TOGGLE_STATE = config.toggleState || false;
        const INCLUDE_TIMESTAMP = config.includeTimestamp || false;
        const OUTPUT_TOPIC = config.outputTopic;

        // Initialize the switch state
        node.switchState = {
            state: "off",            // Toggle state (if TOGGLE_STATE enabled)
            multiClickActive: false, // Indicates multi-click sequence is active
            clickCount: 0,           // Number of press-release cycles in current sequence
            lastPressTime: 0,        // Timestamp of the last press
            multiClickTimer: null,   // Timer for multi-click detection
            longPressTimer: null     // Timer for longpress detection
        };

        /**
         * Sends an immediate event (e.g., "press", "release", "longpress").
         * @param {string} topic - The topic to use for output.
         * @param {string} eventType - The event type to send.
         * @param {number} timestamp - The timestamp of the event.
         */
        const sendEvent = (topic, eventType, timestamp) => {
            const payload = { eventType: eventType };
            if (INCLUDE_TIMESTAMP) {
                payload.timestamp = timestamp;
            }
            node.send({ topic: topic, payload: payload });
        };

        /**
         * Sends a multi-click event (singleclick, doubleclick, tripleclick).
         * For singleclick, if TOGGLE_STATE is enabled, toggles the internal state.
         * @param {string} topic - The topic to use for output.
         * @param {string} eventType - The multi-click event type.
         * @param {number} timestamp - The timestamp of the event.
         */
        const sendMultiClick = (topic, eventType, timestamp) => {
            let newState = node.switchState.state;
            if (TOGGLE_STATE && eventType === "singleclick") {
                newState = (node.switchState.state === "on") ? "off" : "on";
                node.switchState.state = newState;
            }
            const payload = { eventType: eventType };
            if (TOGGLE_STATE) {
                payload.state = newState;
            }
            if (INCLUDE_TIMESTAMP) {
                payload.timestamp = timestamp;
            }
            node.send({ topic: topic, payload: payload });
        };

        // Handle incoming messages
        node.on("input", function(msg) {
            const now = Date.now();
            let topic = OUTPUT_TOPIC && OUTPUT_TOPIC.trim() !== "" ? OUTPUT_TOPIC : msg.topic;
            if (msg.payload === TRIGGER_VALUE) {
                // Button is pressed (down event)
                if (!node.switchState.multiClickActive) {
                    node.switchState.multiClickActive = true;
                    node.switchState.clickCount = 0; // Reset click count for new sequence
                    // Send one "press" event for the sequence
                    sendEvent(topic, "press", now);
                    // Start longpress timer for the first press
                    node.switchState.longPressTimer = setTimeout(() => {
                        if (node.switchState.multiClickActive) {
                            // Button held long enough: send "longpress"
                            sendEvent(topic, "longpress", Date.now());
                            // Abort multi-click sequence (do not count this press-release)
                            node.switchState.clickCount = 0;
                        }
                    }, LONGPRESS_TIME);
                }
                // Increase click count on each press
                node.switchState.clickCount++;
                node.switchState.lastPressTime = now;

                // If a multi-click timer is running, cancel it since a new press occurred
                if (node.switchState.multiClickTimer) {
                    clearTimeout(node.switchState.multiClickTimer);
                    node.switchState.multiClickTimer = null;
                }
            } else {
                // Button is released (up event)
                if (node.switchState.multiClickActive) {
                    // Clear longpress timer if it's still active
                    if (node.switchState.longPressTimer) {
                        clearTimeout(node.switchState.longPressTimer);
                        node.switchState.longPressTimer = null;
                    }
                    // Start/restart the multi-click timer. When it expires, no new press occurred.
                    if (node.switchState.multiClickTimer) {
                        clearTimeout(node.switchState.multiClickTimer);
                    }
                    node.switchState.multiClickTimer = setTimeout(() => {
                        // Timer expired: end of multi-click sequence.
                        // Send one "release" event for the sequence.
                        sendEvent(topic, "release", Date.now());
                        // Determine multi-click type based on clickCount
                        if (node.switchState.clickCount === 1) {
                            sendMultiClick(topic, "singleclick", Date.now());
                        } else if (node.switchState.clickCount === 2) {
                            sendMultiClick(topic, "doubleclick", Date.now());
                        } else if (node.switchState.clickCount >= 3) {
                            sendMultiClick(topic, "tripleclick", Date.now());
                        }
                        // Reset multi-click sequence state
                        node.switchState.multiClickActive = false;
                        node.switchState.clickCount = 0;
                        node.switchState.multiClickTimer = null;
                    }, DOUBLECLICK_TIME);
                }
            }
        });

        node.on("close", function() {
            if (node.switchState.longPressTimer) {
                clearTimeout(node.switchState.longPressTimer);
            }
            if (node.switchState.multiClickTimer) {
                clearTimeout(node.switchState.multiClickTimer);
            }
        });
    }
    RED.nodes.registerType("multi-action-switch", MultiActionSwitchNode);
};
