/**
 * Toàn bộ chuỗi giao diện tiếng Việt. Không viết chuỗi hiển thị trực tiếp trong component
 * để sau này dễ sửa câu chữ hoặc dịch sang ngôn ngữ khác.
 */
export const strings = {
  appName: 'Kề Bên',

  common: {
    loading: 'Đang tải…',
    retry: 'Thử lại',
    errorTitle: 'Đã có lỗi xảy ra',
    errorMessage: 'Vui lòng thử lại. Nếu lỗi lặp lại, hãy khởi động lại ứng dụng.',
    comingSoon: (milestone: string) => `Sẽ có ở ${milestone}`,
    cancel: 'Hủy',
  },

  bootstrap: {
    errorTitle: 'Không mở được dữ liệu trên máy',
    errorMessage: (detail: string) =>
      `Ứng dụng chưa đọc được dữ liệu đã lưu. Hãy thử lại; nếu vẫn lỗi, khởi động lại máy.\n\nChi tiết: ${detail}`,
  },

  devData: {
    screenTitle: 'Dữ liệu (dev)',
    intro: 'Chỉ dùng khi phát triển: xem số bản ghi từng bảng, nạp lại dữ liệu mẫu hoặc xóa sạch.',
    actionsTitle: 'Thao tác',
    reseed: 'Nạp lại dữ liệu mẫu',
    wipe: 'Xóa sạch dữ liệu',
    confirmReseedTitle: 'Nạp lại dữ liệu mẫu?',
    confirmReseedMessage:
      'Toàn bộ dữ liệu hiện có (kể cả cài đặt giao diện) sẽ bị xóa và thay bằng dữ liệu mẫu.',
    confirmWipeTitle: 'Xóa sạch dữ liệu?',
    confirmWipeMessage:
      'Toàn bộ dữ liệu hiện có (kể cả cài đặt giao diện) sẽ bị xóa. Lần mở app sau sẽ tự nạp lại dữ liệu mẫu.',
    doneTitle: 'Đã xong',
    reseedDone: 'Đã nạp lại dữ liệu mẫu.',
    wipeDone: 'Đã xóa sạch dữ liệu.',
    failedTitle: 'Thao tác thất bại',
    tablesTitle: 'Các bảng',
    schemaVersion: (version: number) => `Phiên bản cơ sở dữ liệu: ${version}`,
    totalRecords: (total: number) => `Tổng số bản ghi: ${total}`,
    devOnly: 'Màn hình này chỉ dùng trong môi trường phát triển.',
  },

  tabs: {
    today: 'Hôm nay',
    journeys: 'Đợt điều trị',
    appointments: 'Lịch khám',
    health: 'Sức khỏe',
    settings: 'Cài đặt',
  },

  placeholders: {
    today: {
      title: 'Màn hình Hôm nay',
      description:
        'Danh sách cữ thuốc trong ngày, lịch khám sắp tới và nút ghi nhanh triệu chứng sẽ được dựng ở bước 1C.',
      milestone: 'Bước 1C',
    },
    journeys: {
      title: 'Đợt điều trị',
      description: 'Gom lịch khám, thuốc, triệu chứng, giấy tờ và chi phí theo từng đợt điều trị.',
      milestone: 'Milestone 3',
    },
    appointments: {
      title: 'Lịch khám',
      description: 'Nhắc tái khám trước 3 ngày, 1 ngày, sáng ngày khám và checklist cần mang theo.',
      milestone: 'Milestone 3',
    },
    health: {
      title: 'Sức khỏe',
      description: 'Theo dõi huyết áp, nhịp tim, đường huyết, cân nặng bằng biểu đồ xu hướng.',
      milestone: 'Milestone 4',
    },
  },

  settings: {
    appearanceTitle: 'Giao diện',
    appearanceDescription: 'Chọn giao diện Sáng, Tối hoặc tự đổi theo cài đặt của máy.',
    themeOptions: {
      system: { label: 'Theo hệ thống', description: 'Tự đổi Sáng/Tối theo cài đặt của máy' },
      light: { label: 'Sáng', description: 'Nền sáng, chữ navy đậm' },
      dark: { label: 'Tối', description: 'Nền navy sâu, dịu mắt vào ban đêm' },
    },
    currentlyShowing: (schemeLabel: string) => `Đang hiển thị: ${schemeLabel}`,
    schemeLabels: { light: 'Sáng', dark: 'Tối' },
    aboutTitle: 'Về ứng dụng',
    version: (version: string) => `Phiên bản ${version}`,
    disclaimerTitle: 'Miễn trừ trách nhiệm y khoa',
    developerTitle: 'Dành cho nhà phát triển',
    openDesignPreview: 'Xem bộ giao diện mẫu',
    openDevData: 'Dữ liệu (dev)',
  },

  designPreview: {
    screenTitle: 'Bộ giao diện mẫu',
    intro: 'Màn hình kiểm tra màu navy, chữ và các thành phần giao diện ở mọi chế độ.',
    themeTitle: 'Giao diện',
    sickDayTitle: 'Chế độ Đang mệt (xem trước)',
    sickDayLabel: 'Bật chữ to, nút lớn',
    sickDayDescription: 'Chỉ để xem trước. Bật/tắt chính thức sẽ có ở bước 1C.',
    colorsTitle: 'Bảng màu',
    typographyTitle: 'Cỡ chữ',
    typographySamples: {
      display: 'Tiêu đề lớn — Kề Bên',
      title: 'Tiêu đề — Cữ thuốc buổi sáng',
      subtitle: 'Tiêu đề phụ — Sau ăn sáng',
      body: 'Nội dung — Uống 1 viên với nước lọc.',
      bodySmall: 'Chữ nhỏ — Cập nhật lúc 08:05',
      label: 'Nhãn nút — Đã uống',
    },
    buttonsTitle: 'Nút bấm',
    buttons: {
      primary: 'Đã uống',
      secondary: 'Nhắc lại sau 10 phút',
      outline: 'Đã uống trễ lúc…',
      ghost: 'Bỏ qua',
      danger: 'Xóa dữ liệu',
      disabled: 'Không khả dụng',
      loading: 'Đang lưu',
    },
    chipsTitle: 'Chip lựa chọn',
    chips: ['Bình thường', 'Buồn ngủ', 'Khó chịu tiêu hóa', 'Chóng mặt', 'Khác'],
    badgesTitle: 'Nhãn trạng thái',
    badges: {
      success: 'Đã uống',
      warning: 'Sắp hết thuốc',
      danger: 'Dị ứng',
      info: 'Gợi ý',
      neutral: 'Ngày 4/7',
    },
    cardTitle: 'Thẻ mẫu',
    sampleCard: {
      time: '08:00 · Sau ăn sáng',
      name: 'Thuốc mẫu 500 mg',
      dose: '1 viên · Còn 12 viên',
    },
    statesTitle: 'Trạng thái màn hình',
    emptyTitle: 'Chưa có thuốc nào',
    emptyDescription: 'Thêm thuốc đầu tiên để Kề Bên nhắc bạn đúng giờ.',
    emptyAction: 'Thêm thuốc',
    errorMessage: 'Không đọc được dữ liệu. Đây chỉ là trạng thái mẫu.',
  },
} as const;
