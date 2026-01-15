import csv
import json
import re

# CSV에서 지역을 추출하는 함수
def extract_region(address):
    region_mapping = {
        "강남구": "강남",
        "서초구": "강남",
        "마포구": "홍대/연남",
        "성동구": "성수",
        "종로구": "종로/을지로",
        "중구": "종로/을지로",
        "용산구": "이태원/한남",
        "송파구": "잠실/송리단길",
        "영등포구": "여의도",
        "서대문구": "신촌",
        "광진구": "건대/광진",
    }
    
    for district, region in region_mapping.items():
        if district in address:
            return region
    return "기타"

# CSV 파일 읽기
restaurants = []

csv_content = """name,category,address,latitude,longitude,description,tags,image_url,total_review_count,price_range,Convenience
땀땀,아시안,서울 강남구 강남대로98길 12-5,37.50078426,127.028401,"강남역 웨이팅 필수, 얼큰한 매운 소곱창 쌀국수의 원조 맛집",#이색데이트 #모임 #힙한 #특별한메뉴 #가성비,/images/땀땀.jpg,3574,1.5만 원대,#유아의자 #키즈메뉴 #단체석있음 #주차가능 #내부화장실
정식당,한식(파인다이닝),서울 강남구 선릉로158길 11,37.52559853,127.0406192,"미쉐린 2스타, 현대적으로 재해석한 창의적인 코리안 파인다이닝",#회식 #친구 #편안한 #재료신선 #고급스러운,/images/정식당.jpg,244,10만 원대,#발렛파킹 #주차가능 #넓은좌석간격 #내부화장실 #휠체어가능
다운타우너 청담,양식(버거),서울 강남구 도산대로53길 14,37.52412739,127.0378216,아보카도 버거가 유명한 서울 수제버거의 대표주자,#데이트 #기념일 #분위기좋은 #맛있는 #가격대있는,/images/다운타우너_청담.jpg,872,2만 원대,#내부화장실 #주차가능 #넓은좌석간격
알라보 강남점,샐러드/브런치,서울 강남구 테헤란로 129,37.49969592,127.0321028,슈퍼푸드 아보카도를 활용한 건강하고 든든한 브런치 볼,#데이트 #소개팅 #조용한 #플레이팅예쁜 #가격대있는,/images/알라보_강남점.jpg,1073,1.5만 원대,#내부화장실 #엘리베이터있음 #휠체어가능"""

# 실제로는 전체 CSV를 읽어야 함
# 여기서는 예시로 몇 개만 포함

print("CSV to JSON conversion script")
print("This script would convert the full CSV to JSON format")
print("New fields: price_range, convenience")
