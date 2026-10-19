from pneumonia_detector import PneumoniaDetector


detector = PneumoniaDetector()

image_path = (
    "/home/rishi/PneumoniaML-clean/"
    "dataset/test/NORMAL/IM-0115-0001.jpeg"
)

result = detector.predict(image_path)

print("\n" + "=" * 60)
print("PNEUMONIA ML INFERENCE TEST")
print("=" * 60)

print("Prediction :", result["prediction"])
print(
    "Probability:",
    f"{result['probability_percent']:.2f}%"
)
print(
    "Threshold  :",
    result["threshold"]
)

print("=" * 60)
