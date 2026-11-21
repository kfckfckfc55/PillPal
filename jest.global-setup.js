/**
 * Cố định múi giờ khi chạy test để kết quả giống nhau trên mọi máy (Việt Nam: UTC+7, không đổi giờ mùa hè).
 * Các worker của Jest được tạo sau bước này nên kế thừa biến môi trường TZ.
 */
module.exports = async () => {
  process.env.TZ = 'Asia/Ho_Chi_Minh';
};
