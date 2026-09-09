import numpy as np
import cv2 # Requires installing opencv-python

def calcAverageMotion(priorPoints, curPoints, status, error):
    if curPoints is None:
        return None, None

    validPriorPnts= priorPoints[status == 1]
    validCurPnts = curPoints[status == 1]
    pointError = error[status == 1].flatten()

    # Remove points not consistent with the error and are thus unreliable
    good = pointError <= 550
    validPriorPnts = priorPoints[good]
    validCurPnts = curPoints[good]
    if len(validCurPnts) == 0:
        return None, None

    # Calcs difference between old and new points
    movement = validCurPnts - validPriorPnts
    averMove = np.mean(movement, axis = 0)

    return averMove, validCurPnts

def calcOpticalFlow(prevFrame, curFrame):
    """
        Sets up basic tracking system via an optical flow alg (see details below)
    """

    # Grayscale Convert & Feature Tracking Set up
    prevGray = cv2.cvtColor(prevFrame, cv2.COLOR_BGR2GRAY)
    curGray = cv2.cvtColor(curFrame, cv2.COLOR_BGR2GRAY)
    priorPoints = cv2.goodFeaturesToTrack(prevGray, maxCorners = 250, qualityLevel=0.01, minDistance=5)

    if priorPoints is None:
        return curFrame, None


    # Calc optical flow via Lucas-Kanade & keep tracks with min error
    curPoints, status, error = cv2.calcOpticalFlowPyrLK(prevGray, curGray, priorPoints, None, winSize = (10,10), maxLevel = 5)
    validFloor = error[status == 1].flatten() <= 550

    goodPrev = priorPoints[status == 1]
    goodPrev = priorPoints[validFloor]
    goodCur = curPoints[status == 1]
    goodCur = priorPoints[validFloor]

    # Display Optical Flow
    output = curFrame.copy()
    for old, new in zip(goodPrev, goodCur):
        oldX, oldY = old.astype(int)
        newX, newY = new.astype(int)
        cv2.circle(output, (oldX, oldY), 3, (0, 0, 255), -1)
        cv2.line(output, (oldX, oldY), (newX, newY), (0, 255, 0), 2)

    return output, goodCur

def drawTracking(frame, priorPoints, curPoints, status, error):
    """
        Displays tracking points & motion vectors
    """

    output = frame.copy()
    if curPoints is None:
        return output, 0

    validPriorPnts = priorPoints[status == 1]
    validCurPnts = curPoints[status == 1]
    pointError = error[status == 1].flatten()

    valid = pointError <= 550
    validPriorPnts = validPriorPnts[valid]
    validCurPnts = validCurPnts[valid]

    for old, new in zip(validPriorPnts, validCurPnts):
        oldX, oldY = old.astype(int)
        newX, newY = new.astype(int)
        cv2.circle(output, (newX, newY), 4, (0, 0, 255), -1)
        cv2.line( output, (oldX, oldY), (newX, newY), (0, 255, 0), 2)

    return output, len(validPriorPnts)
    

def getTargetPnts(frame, target):
    """
        Finds trackable feature points inside the selected target.
    """

    x, y, width, height = target
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Creates mask to isolate the target then normalizes it 
    mask = np.zeros_like(gray)
    mask[y: y + height, x : x + width] = 255

    points = cv2.goodFeaturesToTrack(gray, maxCorners = 100, qualityLevel = 0.01, minDistance = 5, mask = mask)

    return points

def selectTarget(frame):
    """
        Allows the user to select a region of interest (ROI).
        Returns the selected rectangle as:
        (x, y, width, height)
    """
    roi = cv2.selectROI("Select Target", frame, fromCenter = False, showCrosshair = True)
    x, y, width, height = roi
    cv2.destroyWindow("Select Target")

    if width == 0 or height == 0:
        return None

    return roi

def trackTarget(prevFrame, curFrame, priorPoints):
    """
        Track previously detected target features into the current frame.

        Returns:
            current_points
            status
            error
    """

    if priorPoints is None:
        return None, None, None

    prevGray = cv2.cvtColor(prevFrame, cv2.COLOR_BGR2GRAY)
    curGray = cv2.cvtColor(curFrame, cv2.COLOR_BGR2GRAY)
    curPoints, status, error = cv2.calcOpticalFlowPyrLK(prevGray, curGray, priorPoints, None, winSize = (10,10), maxLevel = 5)

    if curPoints is None: 
        return None, None, None

    return curPoints, status, error


