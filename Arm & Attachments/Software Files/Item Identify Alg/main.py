from opticalFlow import (
    calcAverageMotion,
    calcOpticalFlow,
    drawTracking,
    getTargetEdges,
    getTargetPnts,
    selectTarget,
    trackTarget
)
from objDetect import detectObj
import numpy as np
import cv2

def runCamera():
    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        print("Sorry, could not open camera.")
        return

    windowName = "Item Identification"
    selectedTarget = None
    curDetect = []
    

    def mouseCallback(event, x, y, flags, param):
        nonlocal selectedTarget

        if event != cv2.EVENT_LBUTTONDOWN:
            return

        possibleTargets = []

        for detect in curDetect:
            x1, y1, x2, y2 = detect["box"]

            if x1 <= x <= x2 and y1 <= y <= y2:
                selectedTarget = detect
                area = (x2 - x1) * (y2 - y1)

                possibleTargets.append(
                    (area, detect)
                )

            if possibleTargets:
                possibleTargets.sort(key=lambda target: target[0])

                selectedTarget = possibleTargets[0][1]

                print(
                    f"Selected target: "
                    f"{selectedTarget['label']} "
                    f"({selectedTarget['confidence']:.2f})"
                )


    cv2.namedWindow(windowName)
    cv2.setMouseCallback(windowName, mouseCallback)

    while selectedTarget is None:
        success, frame = camera.read()

        if not success:
            print("Sorry, could not read frame.")
            camera.release()
            cv2.destroyAllWindows()
            return

        curDetect = detectObj(frame)
        output = frame.copy()
        for detected in curDetect:
            x1, y1, x2, y2 = detected["box"]
            label = detected["label"]
            confidence = detected["confidence"]
            cv2.rectangle(output, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(output, f"{label} {confidence: .2f}", (x1, max(y1 - 10, 20)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv2.putText(output, "Click an object to select target....", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.imshow(windowName, output)

            if cv2.waitKey(1) & 0xFF == 27:
                camera.release()
                cv2.destroyAllWindows
                return

    print("Target selected.")   

    x1, y1, x2, y2 = selectedTarget["box"]  
    print(f"X: {x1}")
    print(f"Y: {y1}")
    print(f"Width: {x2 - x1}")
    print(f"Height: {y2 - y1}")

    target = np.array([
            [[x1, y1]],
            [[x2, y1]],
            [[x2, y2]],
            [[x1, y2]]
        ], dtype=np.int32
    )

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

        curPoints, status, error = trackTarget(prevFrame, frame, priorPoints)
        averMove, validCurPnts = calcAverageMotion(priorPoints, curPoints, status, error)
        output, points = calcOpticalFlow(prevFrame, frame)
        cv2.putText(output, f"Target: {selectedTarget['label']}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        output, pointCount = drawTracking(output, priorPoints, curPoints, status, error, None, target)
        cv2.putText(output, f"Tracked Features: {pointCount}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(output, f"Target: {selectedTarget['label']}", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText( output, f"Tracked Features: {pointCount}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        if averMove is not None:
            moveX = averMove[0]
            moveY = averMove[1]
            cv2.putText(output, f"Motion X: {moveX:.2f}", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText( output, f"Motion Y: {moveY:.2f}", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        else:
            cv2.putText( output, "TRACKING LOST", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        cv2.imshow("Item Identification - Target Tracking", output)
        prevFrame = frame.copy()

        if curPoints is not None and status is not None:
            validPoints = curPoints[status == 1]

            if len(validPoints) > 0:
                priorPoints = validPoints.reshape(-1, 1, 2)
            else:
                priorPoints = None
                if curPoints is not None:
                    priorPoints = curPoints

        if cv2.waitKey(1) & 0xFF == 27:
            break

    camera.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    runCamera()