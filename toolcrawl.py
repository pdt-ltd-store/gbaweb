import requests
import json

def fetch_all_posts(api_url):
    all_posts = []
    page = 1  # Bắt đầu từ trang 1
    while True:
        try:
            # Gửi yêu cầu đến API với tham số phân trang
            response = requests.get(f"{api_url}?page={page}&per_page=100")
            if response.status_code == 200:
                posts = response.json()
                if not posts:
                    # Nếu không còn bài viết nào, thoát khỏi vòng lặp
                    break
                all_posts.extend(posts)  # Thêm bài viết vào danh sách
                print(f"Fetched page {page} with {len(posts)} posts")
                page += 1  # Tăng trang lên để lấy trang tiếp theo
            else:
                # Nếu API trả về lỗi, dừng lại
                print(f"Failed to fetch page {page}: {response.status_code}")
                break
        except Exception as e:
            print(f"An error occurred: {e}")
            break
    return all_posts

# Gọi hàm và lưu dữ liệu
api_url = "https://visualboyadvance.org/wp-json/wp/v2/posts"
all_posts = fetch_all_posts(api_url)

# Lưu toàn bộ dữ liệu vào file JSON
with open("all_posts.json", "w", encoding="utf-8") as file:
    json.dump(all_posts, file, ensure_ascii=False, indent=4)

print(f"Total posts fetched: {len(all_posts)}")
