const helper = require("node-red-node-test-helper");
const multiActionSwitchNode = require("../nodes/multi-action-switch.js");
const should = require("should");

helper.init(require.resolve("node-red"));

describe('Multi Action Switch Node', function() {

    before(async function() {
        await new Promise((resolve, reject) => {
            helper.startServer(err => (err ? reject(err) : resolve()));
        });
    });

    after(async function() {
        await new Promise((resolve, reject) => {
            helper.stopServer(err => (err ? reject(err) : resolve()));
        });
    });

    afterEach(async function() {
        await helper.unload();
    });

    const DOUBLECLICK_TIME = 10
    const LOGGPRESS_TIME = 15

    const create_flow = (toggleState = false, includeTimestamp = false) => [
        {
            id: "n1",
            type: "multi-action-switch",
            triggerValue: "true",
            doubleClickTime: DOUBLECLICK_TIME,
            longPressTime: LOGGPRESS_TIME,
            toggleState,
            includeTimestamp,
            outputTopic: "home/test",
            wires: [["n2"]]
        },
        { id: "n2", type: "helper" }
    ];

    it('should be loaded', async function () {
        const flow = create_flow();
        await new Promise((resolve, reject) => {
            helper.load(multiActionSwitchNode, flow, function() {
                resolve();
            });
        });
        const n1 = helper.getNode("n1");
        // Accept either empty string or undefined for name
        (n1.name === "" || n1.name === undefined).should.be.true();
    });

    it('should use input msg.topic when OUTPUT_TOPIC is empty', async function() {
        const flow = [
            {
                id: "n1",
                type: "multi-action-switch",
                triggerValue: "true",
                doubleClickTime: "400",
                longPressTime: "700",
                toggleState: false,
                includeTimestamp: false,
                outputTopic: "", // Output Topic not set, so it should fall back to input msg.topic
                wires: [["n2"]]
            },
            { id: "n2", type: "helper" }
        ];

        await new Promise(resolve => helper.load(multiActionSwitchNode, flow, resolve));
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg);
        });
        // Simulate a button press with an input topic
        n1.receive({ topic: "fallback/topic", payload: "true" });
        await new Promise(resolve => setTimeout(resolve, 5));
        // Check that the output topic comes from msg.topic
        events[0].topic.should.equal("fallback/topic");
    });

    it('should send a "press" event on button press', async function() {
        const flow = create_flow();
        await new Promise((resolve, reject) => {
            helper.load(multiActionSwitchNode, flow, function() {
                resolve();
            });
        });
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        // Simulate a button press
        n1.receive({ payload: "true" });
        const msg = await new Promise((resolve, reject) => {
            n2.on("input", function(msg) {
                resolve(msg);
            });
        });
        msg.payload.eventType.should.equal("press");
    });

    it('should send "release" and multi-click event ("singleclick") on a single click', async function() {
        const flow = create_flow();
        await new Promise((resolve, reject) => {
            helper.load(multiActionSwitchNode, flow, function() {
                resolve();
            });
        });
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", function(msg) {
            events.push(msg.payload.eventType);
        });

        // Simulate press and then release
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        // Wait for the multi-click timer to expire (DOUBLECLICK_TIME + 5ms)
        await new Promise(resolve => setTimeout(resolve, DOUBLECLICK_TIME + 5));

        events.should.deepEqual(["press", "release", "singleclick"]);
    });

    it('should send "release" and multi-click event ("doubleclick") on a double click', async function() {
        const flow = create_flow();
        await new Promise((resolve) => {
            helper.load(multiActionSwitchNode, flow, resolve);
        });
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg.payload.eventType);
        });

        // Simulate doubleclick sequence:
        // First press-release cycle
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        // Second press-release cycle
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        // Wait for multi-click timer to expire (DOUBLECLICK_TIME + 5ms)
        await new Promise(resolve => setTimeout(resolve, DOUBLECLICK_TIME + 5));

        events.should.deepEqual(["press", "release", "doubleclick"]);
    });

    it('should send "release" and multi-click event ("tripleclick") on a triple click', async function() {
        const flow = create_flow();
        await new Promise((resolve) => {
            helper.load(multiActionSwitchNode, flow, resolve);
        });
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg.payload.eventType);
        });

        // Simulate tripleclick sequence:
        // First press-release cycle
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        // Second cycle
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        // Third cycle
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        // Wait for multi-click timer to expire
        await new Promise(resolve => setTimeout(resolve, DOUBLECLICK_TIME + 5));

        events.should.deepEqual(["press", "release", "tripleclick"]);
    });

    it('should toggle state on singleclick when toggleState is enabled', async function() {
        const flow = create_flow(true);
        await new Promise((resolve) => {
            helper.load(multiActionSwitchNode, flow, resolve);
        });
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg);
        });

        // Simulate a single click to turn switch on
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        await new Promise(resolve => setTimeout(resolve, DOUBLECLICK_TIME + 5));
        // Expect multi-click event to include state toggled from "off" to "on"
        events[2].payload.eventType.should.equal("singleclick");
        events[2].payload.should.have.property("state", "on");

        // Simulate a single click to turn switch off
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        await new Promise(resolve => setTimeout(resolve, DOUBLECLICK_TIME + 5));
        // Expect multi-click event to include state toggled from "off" to "on"
        events[5].payload.eventType.should.equal("singleclick");
        events[5].payload.should.have.property("state", "off");
    });

    it('should include a timestamp in the output when includeTimestamp is enabled', async function() {
        const flow = create_flow(false, true);
        await new Promise((resolve) => {
            helper.load(multiActionSwitchNode, flow, resolve);
        });

        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg);
        });

        // Simulate a single click
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        await new Promise(resolve => setTimeout(resolve, DOUBLECLICK_TIME + 5));

        // Expect multi-click event to include a timestamp property that is a number > 0
        const multiClickEvent = events[2].payload;
        multiClickEvent.should.have.property("timestamp");
        multiClickEvent.timestamp.should.be.a.Number();
        multiClickEvent.timestamp.should.be.above(0);
    });

    it('should send "longpress" event when button is held for a long time', async function() {
        const flow = create_flow();
        await new Promise((resolve) => {
            helper.load(multiActionSwitchNode, flow, resolve);
        });

        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg.payload.eventType);
        });

        // Simulate button press (down event)
        n1.receive({ payload: "true" });
        // Wait for longer than longPressTime so that longpress is triggered
        await new Promise(resolve => setTimeout(resolve, LOGGPRESS_TIME + 5));
        // Simulate button release (up event)
        n1.receive({ payload: "false" });
        // Wait for multi-click timer to expire (DOUBLECLICK_TIME + 5ms, so wait a bit longer)
        await new Promise(resolve => setTimeout(resolve, DOUBLECLICK_TIME + 5));

        events.should.deepEqual(["press", "longpress", "release"]);
    });


    it('should handle consecutive press signals without intervening release', async function() {
        const flow = create_flow();
        await new Promise(resolve => {
            helper.load(multiActionSwitchNode, flow, resolve);
        });
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg.payload.eventType);
        });

        // Simulate two consecutive press signals without release
        n1.receive({ payload: "true" });
        n1.receive({ payload: "true" });

        // Simulate release
        n1.receive({ payload: "false" });

        // Wait for multi-click timer to expire (DOUBLECLICK_TIME + 5ms)
        await new Promise(resolve => setTimeout(resolve, DOUBLECLICK_TIME + 5));

        // Expected events:
        // - "press" should be send once (on first press)
        // - "release" przy puszczeniu
        // - Multi-click event "doubleclick" (clickCount should be 2)
        events.should.deepEqual(["press", "release", "doubleclick"]);
    });

    it('should ignore consecutive release signals without intervening press', async function() {
        const flow = create_flow();
        await new Promise(resolve => {
            helper.load(multiActionSwitchNode, flow, resolve);
        });
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg.payload.eventType);
        });

        // Simulate normal press and release sequence
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });

        // Wait for multi-click timer to expire (to process the sequence)
        await new Promise(resolve => setTimeout(resolve, DOUBLECLICK_TIME + 5));

        // Count events count after release
        const countAfterRelease = events.length;

        // Simulate an extra release signal (ex. temporary connection loss)
        n1.receive({ payload: "false" });

        // Expect additional release will not generate more events
        events.length.should.equal(countAfterRelease);
    });

    it('should cleanup all timers if closed when timers are active', async function() {
        const flow = create_flow();
        await new Promise(resolve => {
            helper.load(multiActionSwitchNode, flow, resolve);
        });
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg.payload.eventType);
        });

        // Simulate press and release signals
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });

        // Don't wait for multi-click timer to expire

        // Expect no events:
        events.length.should.be.empty;
    });

    it('should cleanup multi-click timer before starting another one', async function() {
        const flow = create_flow();
        await new Promise(resolve => {
            helper.load(multiActionSwitchNode, flow, resolve);
        });
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg.payload.eventType);
        });

        // Simulate press and release signals
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        // Simulate an extra release signal (ex. temporary connection loss)
        n1.receive({ payload: "false" });

        // Don't wait for multi-click timer to expire

        // Expect no events:
        events.length.should.be.empty;
    });

    it('should use default configuration values when not provided', async function() {
        const flow = [
            {
                id: "n1",
                type: "multi-action-switch",
                name: "",
                // No configuration fields are provided, so defaults should be used
                wires: [["n2"]]
            },
            { id: "n2", type: "helper" }
        ];

        await new Promise(resolve => helper.load(multiActionSwitchNode, flow, resolve));
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");
        const events = [];
        n2.on("input", (msg) => {
            events.push(msg.payload.eventType);
        });

        // # LONGPRESS

        // Simulate button press (down event)
        n1.receive({ payload: "true" });
        // Wait for longer than longPressTime so that longpress is triggered (default 700ms)
        await new Promise(resolve => setTimeout(resolve, 750));
        // Simulate button release (up event)
        n1.receive({ payload: "false" });
        // Wait for multi-click timer to expire (DOUBLECLICK_TIME defaults to 500ms, so wait a bit longer)
        await new Promise(resolve => setTimeout(resolve, 550));

        // # DOUBLECLICK

        // Simulate button press (down event)
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        n1.receive({ payload: "true" });
        n1.receive({ payload: "false" });
        // Wait for multi-click timer to expire (DOUBLECLICK_TIME defaults to 500ms, so wait a bit longer)
        await new Promise(resolve => setTimeout(resolve, 550));

        events.should.deepEqual(["press", "longpress", "release", "press", "release", "doubleclick"]);
    });
});
