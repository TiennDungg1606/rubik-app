import Link from "next/link";

export default function AboutPage() {
  const story = [
    {
      title: "RubikApp khởi đầu",
      body: "RubikApp cũng bắt đầu giống đa số dự án cá nhân khác — với một vấn đề rất thực tế. Trong thời gian cách ly toàn xã hội, tôi (Dũng) quay lại với khối Rubik sau nhiều năm không đụng tới. Tôi vẫn giải được nhưng cảm giác thiếu hẳn một công cụ hiện đại để giao lưu với toàn xã hội.",
    },
    {
      title: "Lấp khoảng trống phần mềm",
      body: "Càng gắn bó với cộng đồng speedcubing Việt Nam, tôi càng thấy thiếu vắng một bộ đếm thời gian và bộ công cụ đủ mạnh. Hoặc là giao diện quá phức tạp, hoặc là mọi thứ trông cũ kỹ. Thế là tôi tận dụng kiến thức lập trình để tự tạo ra “bộ đếm thời gian mơ ước” của mình, giao lưu với mọi người có camera và mic để có thể trao đổi với nhau, source mở đến từ cubeDesk — tôi tận dụng và mở phiên bản đầu tiên chạy trên desktop và chỉ có đúng một người dùng: tôi.",
    },
    {
      title: "Từ nhật ký cá nhân đến cộng đồng",
      body: "Sau vài tuần bổ sung những tính năng mà bản thân mong muốn, tôi chia sẻ RubikApp lên nhóm Đam mê Rubik. Tôi không nghĩ rằng bài viết ấy lại mở ra hơn một năm phát triển liên tục, hàng loạt bản cập nhật và hàng chục nghìn người dùng thử nghiệm. Dù còn thiếu nhiều tính năng so với các timer khác, mọi người vẫn động viên tôi phát hành công khai.",
    },
    {
      title: "Phiên bản phát hành đầu tiên",
      body: "Vì ban đầu RubikApp chỉ phục vụ riêng tôi nên còn rất nhiều lỗ hổng. Để tự tin mở cửa cho cộng đồng, tôi dành hàng tuần lễ để dọn code, sửa lỗi và hoàn thiện thiết kế. Khi bản phát hành đầu tiên ra mắt, ứng dụng chỉ có vài chục lượt truy cập trong hai tháng đầu tiên, nhưng cảm giác thấy mọi người trò chuyện, chia sẻ trên cộng đồng và dùng RubikApp làm timer chính thật sự rất đã.",
    },
    {
      title: "Lên web để tăng tốc",
      body: "Tôi sớm nhận ra cần mở rộng RubikApp cho nhiều người dùng hơn và cập nhật nhanh hơn. Đó là lý do tôi chuyển toàn bộ ứng dụng từ desktop sang nền tảng webapp cho cả điện thoại nhờ công cụ của trình duyệt. Quyết định này giúp mọi bản cập nhật trở nên liền mạch, mở ra khả năng thi đấu 1v1 và trải nghiệm gia nhập dễ dàng cho người mới.",
    },
    {
      title: "RubikApp hôm nay",
      body: "RubikApp giờ không chỉ là một bộ đếm thời gian. Nó là nơi các cuber Việt luyện tập, thi đấu giao lưu và kết nối bạn bè mỗi ngày. Với các chế độ 1v1, 2vs2, phòng chờ, thống kê ao5 và quản lý tài khoản, tôi kỳ vọng RubikApp sẽ trở thành nền tảng luyện tập chuẩn mực cho cộng đồng. Tương lai vẫn còn rất nhiều thứ để khám phá.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F8FBFF] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 right-0 h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-24 left-[-60px] h-[480px] w-[480px] rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_left,_#a5b4fc33,_transparent_45%),_radial-gradient(circle_at_bottom_right,_#34d39933,_transparent_45%)]" />
      </div>
      <div className="relative z-10 mx-auto max-w-4xl space-y-10">
        <header className="space-y-3 text-left">
        <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
          >
            <span aria-hidden="true">←</span>
            Quay về trang chủ
          </Link>
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">Hành trình xây RubikApp</h1>
          <p className="text-base text-slate-600">Lật lại câu chuyện từ những ngày chơi online bằng messenges đến mục tiêu trở thành sân chơi trực tuyến lớn nhất cho cuber Việt.</p>
        </header>
        <div className="space-y-8 rounded-[32px] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
            {story.map(section => {
              const imageMap: Record<string, { src: string; alt: string }> = {
                "Từ nhật ký cá nhân đến cộng đồng": { src: "/anhphong.png", alt: "Cộng đồng RubikApp" },
                "Phiên bản phát hành đầu tiên": { src: "/anhalg.png", alt: "Phiên bản đầu RubikApp" },
                "RubikApp hôm nay": { src: "/anhtimer.png", alt: "Giao diện timer RubikApp" },
              };
              const image = imageMap[section.title];
              return (
                <section key={section.title} className="space-y-3">
                  {image && (
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-inner">
                      <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                  <p className="text-base leading-relaxed text-slate-600">{section.body}</p>
                </section>
              );
            })}
        </div>
        <p className="text-left text-sm text-slate-500">— Chu Tiến Dũng, người sáng lập RubikApp</p>
      </div>
    </main>
  );
}
