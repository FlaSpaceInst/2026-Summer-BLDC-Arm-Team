# Class for controlling video feed and computer vision software on EZ-RASSOR
# 2023 & 2024 Noah Gregory, Adam Whitlock, Riya Signh for Florida Space Institute

from PIL import Image
import cv2
from ezcamera import arucoGenerator
import numpy as np
import time
from datetime import datetime, timedelta
import json

# Debugging tag for this class
DEBUG_TAG = "Debug: cameraController"

# Dictionaries of ArUco markers
# Each marker dictionary is defined by: cv2.aruco.DICT_NXN_M
# NXN represents the dimensions in bits of the marker image
# M represents how many unique markers can be made from that dictionary
ARUCO_DICT = {
    "DICT_4X4_50": cv2.aruco.DICT_4X4_50,
    "DICT_4X4_100": cv2.aruco.DICT_4X4_100,
    "DICT_4X4_250": cv2.aruco.DICT_4X4_250,
    "DICT_4X4_1000": cv2.aruco.DICT_4X4_1000,
    "DICT_5X5_50": cv2.aruco.DICT_5X5_50,
    "DICT_5X5_100": cv2.aruco.DICT_5X5_100,
    "DICT_5X5_250": cv2.aruco.DICT_5X5_250,
    "DICT_5X5_1000": cv2.aruco.DICT_5X5_1000,
    "DICT_6X6_50": cv2.aruco.DICT_6X6_50,
    "DICT_6X6_100": cv2.aruco.DICT_6X6_100,
    "DICT_6X6_250": cv2.aruco.DICT_6X6_250,
    "DICT_6X6_1000": cv2.aruco.DICT_6X6_1000,
    "DICT_7X7_50": cv2.aruco.DICT_7X7_50,
    "DICT_7X7_100": cv2.aruco.DICT_7X7_100,
    "DICT_7X7_250": cv2.aruco.DICT_7X7_250,
    "DICT_7X7_1000": cv2.aruco.DICT_7X7_1000,
    "DICT_ARUCO_ORIGINAL": cv2.aruco.DICT_ARUCO_ORIGINAL,
    "DICT_APRILTAG_16h5": cv2.aruco.DICT_APRILTAG_16h5,
    "DICT_APRILTAG_25h9": cv2.aruco.DICT_APRILTAG_25h9,
    "DICT_APRILTAG_36h10": cv2.aruco.DICT_APRILTAG_36h10,
    "DICT_APRILTAG_36h11": cv2.aruco.DICT_APRILTAG_36h11
}

MARKER_DICTIONARY = "DICT_5X5_100"
MARKER_DIR = 'tags/'

port = 1

frame_width = 400
frame_height = 280
capture = cv2.VideoCapture(port)
capture.set(cv2.CAP_PROP_FRAME_WIDTH, frame_width)
capture.set(cv2.CAP_PROP_FRAME_HEIGHT, frame_height)

arucoDict = cv2.aruco.getPredefinedDictionary(ARUCO_DICT[MARKER_DICTIONARY])
arucoParams = cv2.aruco.DetectorParameters()
detector = cv2.aruco.ArucoDetector(arucoDict, arucoParams)
detected_markerIds = []
detectionReport = {}

# Draws bounding boxes around aruco markers
def aruco_display(corners, ids, rejected, image):
    if len(corners) > 0:
        ids = ids.flatten()

        for(markerCorner, markerID) in zip(corners,ids):

            corners = markerCorner.reshape((4, 2))
            (topLeft, topRight, bottomRight, bottomLeft) = corners

            topRight = (int(topRight[0]), int(topRight[1]))
            bottomRight = (int(bottomRight[0]), int(bottomRight[1]))
            bottomLeft = (int(bottomLeft[0]), int(bottomLeft[1]))
            topLeft = (int(topLeft[0]), int(topLeft[1]))

            cv2.line(image, topLeft, topRight, (0, 255, 0), 2)
            cv2.line(image, topRight, bottomRight, (0, 255, 0), 2)
            cv2.line(image, bottomRight, bottomLeft, (0, 255, 0), 2)
            cv2.line(image, bottomLeft, topLeft, (0, 255, 0), 2)

            cX = int((topLeft[0] + bottomRight[0]) / 2.0)
            cY = int((topLeft[1] + bottomRight[1]) / 2.0)
            cv2.circle(image, (cX, cY), 4, (0,0,255), -1)

            cv2.putText(image, str(markerID), (topLeft[0], topLeft[1] - 10), cv2.FONT_HERSHEY_SIMPLEX,
                                0.5, (0, 255, 0), 2)
            print("[Inference] ArUco marker ID: {}".format(markerID))
    return image

# Current Time in format: YYYY-MM-DD HH:MM:SS.SSS
def getCurrentTime():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

# Returns true if it has beem more than 7.5 seconds since last marker detected
def isItTimeToDefaultResponse(lastDetectionTime):
    currTime = datetime.now()
    lastTime = datetime.strptime(lastDetectionTime, "%Y-%m-%d %H:%M:%S.%f")
    timeDif = currTime - lastTime
    return timeDif >= timedelta(seconds = 7.5)

# Response when a marker hasn't been detected
def defaultResponse():
    return {
        "detection": "false",
        "time": str(getCurrentTime())
    }

# When it is called for, turns python dictionary into a json object
def getDetectionReport():
    global detectionReport
    return json.dumps(detectionReport)

# Updates detection report with ID, time, and x, y, z coordinates
def setDetectionReport(markerId, time, x, y, z):
    return {
        "detection": str(markerId),
        "time": str(time),
        "x": x,
        "y": y,
        "z": z
    }

# Captures video feed from attached camera, detects aruco markers, and renders it in a webpage
def generate_stream():
    print(DEBUG_TAG + "Generating video stream")

    global detectionReport
    global capture  # Ensure capture is accessible globally

    while True:
        # Check if camera is open, otherwise try to reopen it
        if not capture.isOpened():
            print("Camera is not opened. Attempting to reopen...")
            capture.release()
            time.sleep(1)
            capture = cv2.VideoCapture(port)  # Reinitialize camera
            continue  # Skip to next iteration

        ret, frame = capture.read()

        if not ret:
            print("Error: Unable to retrieve frame. Displaying error image.")
            capture.release()  # Release camera if error occurs
            time.sleep(1)
            capture = cv2.VideoCapture(port)  # Attempt to restart camera
            img = cv2.imread(r'../../resources/cameraerror.jpg')
            ret, jpeg = cv2.imencode('.jpg', img)
            frame = jpeg.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            continue  # Skip processing markers if there's no frame

        # Detect markers
        markerCorners, markerIds, rejectedCandidates = detector.detectMarkers(frame)

        # Update detection report if markers are found
        if markerIds is not None:
            detectionReport = setDetectionReport(markerIds[0], getCurrentTime(), 4, 5, 6)

        # Reset detection report if timeout occurs
        if isItTimeToDefaultResponse(detectionReport["time"]):
            detectionReport = defaultResponse()

        # Display detected markers
        detected_markers = aruco_display(markerCorners, markerIds, rejectedCandidates, frame)

        # Encode frame as JPEG
        ret, jpeg = cv2.imencode('.jpg', detected_markers)
        frame = jpeg.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


# Initialize variables before ArUco detection polling starts
def initialize():
    global detectionReport
    detectionReport = defaultResponse()
