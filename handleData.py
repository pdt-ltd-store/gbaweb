import json
import re
from bs4 import BeautifulSoup

def extract_data(post_data):
    # Parse JSON
    id = post_data.get("id", None)
    title = post_data.get("title", {}).get("rendered", None)
    link = post_data.get("link", None)
    date = post_data.get("date", None)
    thumbnail = post_data.get("jetpack_featured_media_url", None)

    # Extract download_link from content.rendered
    content_html = post_data.get("content", {}).get("rendered", "")
    soup = BeautifulSoup(content_html, "html.parser")
    download_links = [a['href'] for a in soup.find_all('a', class_='wptb-link-target', href=True) if 'github' in a['href']]
    download_link = download_links[0] if download_links else None

    # Extract additional fields (Platform, Region, Version) from table
    platform, region, version = None, None, None
    tables = soup.find_all("table")
    for table in tables:
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) >= 2:
                header = cells[0].get_text(strip=True)
                value = cells[1].get_text(strip=True)
                if header == "Platform":
                    platform = value
                elif header == "Region":
                    region = value
                elif header == "Version":
                    version = value

    # Compile extracted data into a dictionary
    extracted_data = {
        "id": id,
        "title": title,
        "link": link,
        "download_link": download_link,
        "date": date,
        "thumbnail": thumbnail,
        "platform": platform,
        "region": region,
        "version": version
    }

    return extracted_data

# Process all posts from all_post.json
def process_all_posts(file_path):
    with open(file_path, "r", encoding="utf-8") as file:
        all_posts = json.load(file)

    extracted_data_list = []
    for post in all_posts:
        extracted_data = extract_data(post)
        extracted_data_list.append(extracted_data)

    return extracted_data_list

# Save extracted data to a new JSON file
def save_extracted_data(extracted_data, output_file):
    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(extracted_data, file, indent=4)

# Example usage
if __name__ == "__main__":
    input_file = "all_posts.json"  # Path to your input JSON file
    output_file = "extracted_data.json"  # Path to save the extracted data

    extracted_posts = process_all_posts(input_file)
    save_extracted_data(extracted_posts, output_file)
    print(f"Extracted data saved to {output_file}")
