from opticalFlow import (
    calcAverageMotion,
    calcOpticalFlow,
    drawTracking,
    getTargetEdges,
    getTargetPnts,
    selectTarget,
    trackTarget
)
import cv2

def runCamera():
    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        print("Sorry, could not open camera.")
        return

    windowName = "Item Identification"
    selectedTarget = None

    def select(event, x, y, flags, param):
        nonlocal selectedTarget

        if event == cv2.EVENT_LBUTTONDOWN:
            for targetOutline in currentTargets:
                if cv2.pointPolygonTest(targetOutline, (x, y), False) >= 0:
                    selectedTarget = targetOutline
                    break

    cv2.namedWindow(windowName)
    cv2.setMouseCallback(windowName, select)
    currentTargets = []

    while selectedTarget is None:
        success, frame = camera.read()

        if not success:
            print("Sorry, could not read frame.")
            camera.release()
            cv2.destroyAllWindows()
            return

        currentTargets = getTargetEdges(frame)
        output = frame.copy()
        for targetOutline in currentTargets:
            cv2.drawContours( output, [targetOutline], -1, (0, 255, 0), 2)

        cv2.putText(output, "Click an outlined target to select", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.imshow(windowName, output)

        if cv2.waitKey(1) & 0xFF == 27:
            camera.release()
            cv2.destroyAllWindows()
            return

    target = selectedTarget
    print("Target selected.")

    priorPoints = getTargetPnts(frame, target)
    if priorPoints is None:
        print("Could not find trackable features.")
        camera.release()
        cv2.destroyAllWindows()
        return

    prevFrame = frame.copy()
    while True:
        success, frame = camera.read()

        if not success:
            print("Could not read frame.")
            break

        curPoints, status, error = trackTarget(prevFrame, frame,priorPoints)
        averMove, validCurPnts = calcAverageMotion(priorPoints, curPoints, status, error)
        output, pointCount = drawTracking( frame, priorPoints, curPoints, status, error, currentTargets, target)
        output, points = calcOpticalFlow(prevFrame,frame)
        cv2.putText(output, f"Tracked Features: {pointCount}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        if averMove is not None:
            moveX = averMove[0]
            moveY = averMove[1]

            cv2.putText(output, f"Motion X: {moveX:.2f}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(output, f"Motion Y: {moveY:.2f}", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        else:
            cv2.putText( output, "TRACKING LOST", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        cv2.imshow("Item Identification - Target Tracking", output)

        prevFrame = frame.copy()

        if curPoints is not None:
            priorPoints = curPoints

        if cv2.waitKey(1) & 0xFF == 27:
            break

    camera.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    runCamera()