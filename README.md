# node-red-contrib-multi-action-switch

**Multi Action Switch** is a custom Node-RED node for handling various button press events, including:
- **Single Click**
- **Double Click**
- **Triple Click**
- **Long Press**
- **Press & Release**

It is designed for **smart home** systems and integrates well with MQTT, Home Assistant, and Apple HomeKit.

## 🛠 Installation

To install the node directly from Node-RED:
1. Open **Node-RED**.
2. Go to **Manage Palette** → **Install**.
3. Search for **"node-red-contrib-multi-action-switch"**.
4. Click **Install**.

Alternatively, you can install it manually using:
```bash
cd ~/.node-red
npm install node-red-contrib-multi-action-switch
```
Then restart Node-RED:
```bash
node-red-restart
```

---

## 🎛 Node Configuration

After installing, the **Multi Action Switch** node will be available in the **"function"** category.

### 🔧 **Node Properties**
| Property             | Type    | Default  | Description |
|----------------------|---------|----------|-------------|
| **Trigger Value**    | String  | `"true"` | The value that triggers the switch. |
| **Double Click Time** | Number  | `400` ms | The maximum time window for a double click. |
| **Long Press Time**  | Number  | `700` ms | The minimum time required for a long press. |
| **Toggle State**     | Boolean | `false`  | Whether the node should manage on/off state. |
| **Include Timestamp** | Boolean | `false` | If enabled, the node adds a timestamp to each event. |
| **Output Topic**      | String  | *(optional)*  | MQTT-style topic for event output. If left blank, the node will pass through the incoming message's topic (`msg.topic`). |

---

## 🔄 How It Works

### **Event Handling**
The node processes button inputs and generates output messages based on how the button is pressed. The supported events:

| Event Type     | Description |
|---------------|-------------|
| **press**      | Triggered immediately when the button is pressed. |
| **release**    | Triggered when the button is released. |
| **singleclick** | Sent after a single press and release. |
| **doubleclick** | Sent after two quick presses. |
| **tripleclick** | Sent after three quick presses. |
| **longpress**  | Sent if the button is held longer than the configured `Long Press Time`. |

### **Example Usage with MQTT**
If `Output Topic` is set to `"home/livingroom/switch"`, the node will send messages like:

```json
{
  "topic": "home/livingroom/switch",
  "payload": {
    "eventType": "singleclick",
    "timestamp": 1700000000000
  }
}
```

---

## 🚀 Example Flows

### **Basic Usage**
The following flow demonstrates how to connect a button input to a `multi-action-switch` node and print the output.

```json
[
    {
        "id": "n1",
        "type": "multi-action-switch",
        "triggerValue": "true",
        "doubleClickTime": "400",
        "longPressTime": "700",
        "toggleState": false,
        "includeTimestamp": true,
        "outputTopic": "home/test",
        "wires": [["n2"]]
    },
    {
        "id": "n2",
        "type": "debug",
        "name": "Debug Output"
    }
]
```

### **Using with MQTT**
If you're integrating this with **Home Assistant** via MQTT, you can set up an **MQTT Out** node with:

- **Topic:** `home/livingroom/switch`
- **Payload:** `msg.payload`

Then, Home Assistant can listen for events like `"singleclick"` or `"longpress"`.

---

## 🔄 **State Management**
If **Toggle State** is enabled (`toggleState: true`), the node will **remember** its current state (`"on"` or `"off"`). The state will be included in `singleclick` events:

```json
{
  "eventType": "singleclick",
  "state": "on",
  "timestamp": 1700000000000
}
```
The state toggles on each **singleclick**.

---

## 🛠 **Troubleshooting**
| Problem | Possible Solution |
|---------|------------------|
| The node is not responding to button presses | Ensure that the **Trigger Value** matches the expected input (`"true"`, `1`, etc.). |
| Double click or triple click events are not detected | Increase the **Double Click Time** slightly to allow for slower clicking. |
| Long press fires too early | Increase the **Long Press Time** value. |

---

## 📜 **License**
This project is licensed under the **MIT License**.

---

## 🔗 **Links**
- [Node-RED Flows Library](https://flows.nodered.org/)
- [GitHub Repository](https://github.com/yourusername/node-red-contrib-multi-action-switch)
- [npm Package](https://www.npmjs.com/package/node-red-contrib-multi-action-switch)

---

## ✅ Summary
The **Multi Action Switch** node makes handling button presses in **smart home** systems easy. It supports **multi-click events**, **long press detection**, and **state toggling**. It is useful for integrating physical switches into **Home Assistant**, **MQTT**, and **Apple HomeKit**.

If you have any questions or need help, feel free to open an issue on GitHub! 🚀
