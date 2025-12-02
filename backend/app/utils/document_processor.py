"""
Document processing utilities for extracting information from driver documents
"""
import re
from datetime import datetime
import os

def extract_license_info(file_path):
    """
    Extract license information from uploaded document
    This is a simple pattern-based extraction. For production, use OCR libraries like:
    - pytesseract (Tesseract OCR)
    - easyocr
    - AWS Textract
    - Google Cloud Vision API
    """
    try:
        # For now, return None to indicate manual entry is needed
        # In production, implement OCR here
        
        # Example structure for future OCR implementation:
        extracted_data = {
            'license_number': None,
            'expiry_date': None,
            'issue_date': None,
            'name': None,
            'confidence': 0.0,
            'extraction_method': 'manual_required'
        }
        
        # TODO: Implement OCR extraction
        # Example with pytesseract:
        # from PIL import Image
        # import pytesseract
        # 
        # if file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
        #     image = Image.open(file_path)
        #     text = pytesseract.image_to_string(image)
        #     
        #     # Extract license number (Ethiopian format: e.g., AA-123456)
        #     license_match = re.search(r'[A-Z]{2}-\d{6}', text)
        #     if license_match:
        #         extracted_data['license_number'] = license_match.group()
        #     
        #     # Extract dates (various formats)
        #     date_patterns = [
        #         r'\d{2}/\d{2}/\d{4}',  # DD/MM/YYYY
        #         r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
        #     ]
        #     for pattern in date_patterns:
        #         dates = re.findall(pattern, text)
        #         if dates:
        #             # Assume last date is expiry
        #             extracted_data['expiry_date'] = dates[-1]
        #             break
        
        return extracted_data
        
    except Exception as e:
        print(f"❌ Error extracting license info: {e}")
        return None

def validate_license_number(license_number):
    """Validate Ethiopian license number format"""
    if not license_number:
        return False
    
    # Ethiopian license format: AA-123456 or similar
    pattern = r'^[A-Z]{2}-\d{6}$'
    return bool(re.match(pattern, license_number.upper()))

def validate_expiry_date(expiry_date):
    """Validate that expiry date is in the future"""
    try:
        if isinstance(expiry_date, str):
            # Try different date formats
            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                try:
                    date_obj = datetime.strptime(expiry_date, fmt)
                    return date_obj > datetime.now()
                except ValueError:
                    continue
        return False
    except Exception:
        return False

def get_file_info(file_path):
    """Get basic file information"""
    try:
        if not os.path.exists(file_path):
            return None
        
        stat = os.stat(file_path)
        return {
            'size': stat.st_size,
            'size_mb': round(stat.st_size / (1024 * 1024), 2),
            'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'extension': os.path.splitext(file_path)[1].lower()
        }
    except Exception as e:
        print(f"❌ Error getting file info: {e}")
        return None

# Future enhancement: Add OCR installation instructions
"""
To enable automatic license extraction, install OCR dependencies:

1. Install Tesseract OCR:
   - Ubuntu: sudo apt-get install tesseract-ocr
   - macOS: brew install tesseract
   - Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki

2. Install Python packages:
   pip install pytesseract pillow

3. For better accuracy, consider cloud-based OCR:
   - AWS Textract: pip install boto3
   - Google Cloud Vision: pip install google-cloud-vision
   - Azure Computer Vision: pip install azure-cognitiveservices-vision-computervision
"""
