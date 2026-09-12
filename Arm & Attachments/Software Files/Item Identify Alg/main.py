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
    currentDetections = []
    priorPoints = None
    priorFrame = None

    def mouseCallback(event, x, y, flags, param):
        nonlocal selectedTarget

        if event != cv2.EVENT_LBUTTONDOWN:
            return

        for detection in currentDetections:
            x1, y1, x2, y2 = detection["box"]

            if x1 <= x <= x2 and y1 <= y <= y2:
                selectedTarget = detection
                print( 
                    f"Selected target: "
                    f"{detection['label']} "
                    f"({detection['confidence']:.2f})"
                )
                break


    cv2.namedWindow(windowName)
    cv2.setMouseCallback(windowName, mouseCallback)
    currentTargets = []

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

    camera.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    runCamera()