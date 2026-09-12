from ultralytics import YOLO
import cv2
model = YOLO("yolo26n.pt")

def detectObj(frame):
    """
        Detects objects in the current camera frame.

        Returns:
            results from the object detection model
    """

    res = model(frame, verbose=False)
    detections = []

    for r in res :
        for box in res.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cID = int(box.cls[0])
            confidence = float(box.conf[0])
            detections.append({
                "box" : (int(x1), int(y1), int(x2), int(y2)),
                "label": res.names[cID],
                "confidence": confidence
            })

    return detections

def selectObj(frame, detections):
    """
        Allows the user to select one detected object
        while keeping the camera feed live.

        Returns:
            selected detection, or None
    """

    selected = None

    def mouseCallback(event, x, y, flags, param):
        nonlocal selected

        if event != cv2.EVENT_LBUTTONDOWN:
            return

        for detection in detections:
            x1, y1, x2, y2 = detection["box"]

            if x1 <= x <= x2 and y1 <= y <= y2:
                selected = detection
                break

    windowName = "Item Identification"

    cv2.namedWindow(windowName)
    cv2.setMouseCallback(windowName, mouseCallback)

    while selected is None:
        output = frame.copy()
        for detection in detections:
            x1, y1, x2, y2 = detection["box"]
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0,255,0), 2)
            cv2.putText(frame, detection["label"], (x1, y1, - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        if cv2.waitKey(1) & 0xFF == 27:
            return None

    return selected
