const express = require("express");
const router = express.Router();
const serial = require("../serial");
const OPEN_EFFECTOR = 0x09;
const CLOSE_EFFECTOR = 0x0A;

// Routes for the HTTP commands
router.post("/open", (req, res) => {
    serial.write(Buffer.from([OPEN_EFFECTOR]));
    res.status(200).json({
        success: true,
        message: "Opening end effector."
    })
})

router.post("/close", (req, res) => {
    serial.write(Buffer.from([CLOSE_EFFECTOR]));
    res.status(200).json({
        success: true,
        message: "Closing end effector."
    })
})

module.exports = router;