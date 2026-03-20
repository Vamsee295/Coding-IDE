import mss
import pytesseract
from PIL import Image
import os
import io
import base64

class ScreenService:
    def __init__(self):
        # Allow user to specify tesseract path if needed
        tess_path = os.getenv("TESSERACT_PATH", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
        if os.path.exists(tess_path):
            pytesseract.pytesseract.tesseract_cmd = tess_path
            print(f"[ScreenService] Using tesseract at: {tess_path}")
        else:
            print("[ScreenService] Tesseract not found at default path. Ensure it's in your PATH.")

    def capture_screen(self):
        """Capture the primary monitor as a base64 image and extract text."""
        try:
            with mss.mss() as sct:
                # Capture the primary monitor
                monitor = sct.monitors[1]
                screenshot = sct.grab(monitor)
                
                # Convert to PIL Image
                img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
                
                # Extract text using OCR
                text = pytesseract.image_to_string(img)
                
                # Convert image to base64 for preview (optional)
                buffered = io.BytesIO()
                img.thumbnail((800, 600)) # Resize for chat preview
                img.save(buffered, format="JPEG")
                img_str = base64.b64encode(buffered.getvalue()).decode()

                return {
                    "text": text,
                    "image": f"data:image/jpeg;base64,{img_str}",
                    "success": True
                }
        except Exception as e:
            return {
                "error": str(e),
                "success": False
            }

screen_service = ScreenService()
