-- V21: Mở rộng kiểu dữ liệu cột proof_images_json sang LONGTEXT để lưu trữ nhiều URL hoặc chuỗi base64 fallback
ALTER TABLE return_request MODIFY COLUMN proof_images_json LONGTEXT NULL;

