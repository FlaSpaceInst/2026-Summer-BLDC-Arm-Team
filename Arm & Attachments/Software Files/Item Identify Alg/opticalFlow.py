import numpy as np
import cv2 # Requires installing opencv-python

def calcAverageMotion(priorPoints, curPoints, status, error):
    if curPoints is None:
        return None, None

    validPriorPnts = priorPoints[status == 1]
    validCurPnts = curPoints[status == 1]
    pointError = error[status == 1].flatten()

    # Remove points not consistent with the error and are thus unreliable
    good = pointError <= 550
    validPriorPnts = validPriorPnts[good]
    validCurPnts = validCurPnts[good]

    if len(validCurPnts) == 0:
        return None, None

    # Calcs difference between old and new points
    movement = validCurPnts - validPriorPnts
    averMove = np.mean(movement, axis=0)

    return averMove, validCurPnts

def calcOpticalFlow(prevFrame, curFrame):
    """
        Calculates basic optical flow across the full camera frame.
        Used to determine overall scene motion.
        Target-specific tracking is handled separately by trackTarget().
    """

    # Grayscale Convert & Feature Tracking Set up
    prevGray = cv2.cvtColor(prevFrame, cv2.COLOR_BGR2GRAY)
    curGray = cv2.cvtColor(curFrame, cv2.COLOR_BGR2GRAY)
    priorPoints = cv2.goodFeaturesToTrack(prevGray, maxCorners = 250, qualityLevel = 0.01, minDistance = 5)

    if priorPoints is None:
        return curFrame.copy(), None

    # Calc optical flow via Lucas-Kanade & keep tracks with min error
    curPoints, status, error = cv2.calcOpticalFlowPyrLK(prevGray, curGray, priorPoints, None, winSize = (10, 10), maxLevel = 5)
    if curPoints is None or status is None or error is None:
        return curFrame.copy(), None
    
    validPriorPnts = priorPoints[status == 1]
    validCurPnts = curPoints[status == 1]
    pointError = error[status == 1].flatten()
    valid = pointError <= 550

    goodPrev = validPriorPnts[valid]
    goodCur = validCurPnts[valid]

    return curFrame.copy(), goodCur

def drawTracking(frame, priorPoints, curPoints, status, error, targets = None, selectedTarget = None):
    """
        Displays detected target outlines, tracking points, and motion vectors.
    """

    output = frame.copy()

    # Display detected target outlines
    if targets is not None:
        for target in targets:
            cv2.drawContours(
                output,
                [target],
                -1,
                (0, 255, 0),
                2
            )

    # Highlight selected target
    if selectedTarget is not None:
        cv2.drawContours(
            output,
            [selectedTarget],
            -1,
            (255, 0, 0),
            3
        )

    # No tracking points available
    if curPoints is None:
        return output, 0

    validPriorPnts = priorPoints[status == 1]
    validCurPnts = curPoints[status == 1]
    pointError = error[status == 1].flatten()

    valid = pointError <= 550
    validPriorPnts = validPriorPnts[valid]
    validCurPnts = validCurPnts[valid]

    # Display optical flow tracking
    for old, new in zip(validPriorPnts, validCurPnts):
        oldX, oldY = old.astype(int)
        newX, newY = new.astype(int)

        cv2.circle(output, (newX, newY), 4, (0, 0, 255), -1)
        cv2.line(
            output,
            (oldX, oldY),
            (newX, newY),
            (0, 255, 0),
            2
        )

    return output, len(validPriorPnts)

def getTargetEdges(frame):
    """
        Detects possible object outlines in the current frame.

        Uses light image preprocessing before Canny edge detection
        to reduce small amounts of image noise while preserving
        object boundaries.
    """

    targets = []
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurGray = cv2.GaussianBlur(gray, (5, 5), 0)

    # Detect edges & connect small gaps then removes noise
    edges = cv2.Canny(blurGray, 30, 150)
    #kernel = np.ones((3, 3), np.uint8)
    #edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations = 1)
    #edges = cv2.morphologyEx(edges, cv2.MORPH_OPEN, kernel, iterations = 1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for contour in contours:
        area = cv2.contourArea(contour)
        if area >= 500:
            perimeter = cv2.arcLength(contour, True)

            if perimeter == 0:
                continue

            targets.append(contour)

    return targets

def getTargetPnts(frame, target):
    """
        Finds trackable feature points inside the selected target.
    """

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Creates mask to isolate the selected target
    mask = np.zeros_like(gray)
    cv2.drawContours(mask, [target], -1, 255, -1)
    points = cv2.goodFeaturesToTrack(gray, maxCorners = 100, qualityLevel = 0.01, minDistance = 5, mask = mask)

    return points

def selectTarget(frame, targets):
    """
        Allows the user to select a detected target by clicking inside
        one of the detected outlines.
        Returns the selected contour.
    """

    selectedTarget = None

    def select(event, x, y, flags, param):
        nonlocal selectedTarget

        if event == cv2.EVENT_LBUTTONDOWN:
            for target in targets:
                if cv2.pointPolygonTest(target, (x, y), False) >= 0:
                    selectedTarget = target
                    break

    cv2.setMouseCallback("Item Identification", select)

    return selectedTarget

def trackTarget(prevFrame, curFrame, priorPoints):
    """
        Tracks previously detected target features into the current frame.

        Uses Lucas-Kanade optical flow to determine where the selected target's feature points moved.
        Removes unreliable feature tracks before they are carried into the next frame.
        
        Returns:
            current_points
            status
            error
    """

    if priorPoints is None:
        return None, None, None

    prevGray = cv2.cvtColor(prevFrame, cv2.COLOR_BGR2GRAY)
    curGray = cv2.cvtColor(curFrame, cv2.COLOR_BGR2GRAY)

    curPoints, status, error = cv2.calcOpticalFlowPyrLK(prevGray, curGray, priorPoints, None, winSize = (10, 10), maxLevel = 5)
    valid = ((status.flatten() == 1) & (error.flatten() <= 550))
    if curPoints is None or status is None or error is None or not np.any(valid):
        return None, None, None

    filteredCurPoints = curPoints.copy()
    filteredStatus = status.copy()
    filteredError = error.copy()
    filteredStatus[~valid] = 0

    return filteredCurPoints, filteredStatus, filteredError


