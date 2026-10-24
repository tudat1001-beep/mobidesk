import { useState } from "react";
import { ArrowLeft, BookOpen, Download, Search } from "lucide-react";
import guide from "../content/user-guide.json";
import { normalize } from "../domain/money";

export default function UserGuide({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");
  const sections = guide.sections.filter((s) =>
    normalize(
      [s.title, s.intro, ...s.steps, ...s.notes, s.example || ""].join(" "),
    ).includes(normalize(query)),
  );
  function go(id: string) {
    document
      .getElementById(`guide-${id}`)
      ?.scrollIntoView({ behavior: "auto", block: "start" });
  }
  return (
    <div className="guide-page">
      <header className="guide-header">
        <a className="brand" href="#dashboard">
          <img src="/icon.svg" alt="" />
          <strong>MobiDesk</strong>
        </a>
        <button className="btn secondary" onClick={onBack}>
          <ArrowLeft size={17} />
          Về ứng dụng
        </button>
      </header>
      <main className="guide-main">
        <div className="guide-intro">
          <span className="guide-eyebrow">
            <BookOpen size={17} /> TÀI LIỆU VẬN HÀNH · {guide.version}
          </span>
          <h1>{guide.title}</h1>
          <p>{guide.intro}</p>
          <a className="btn secondary" href="/huong-dan-su-dung.md" download>
            <Download size={17} />
            Tải hướng dẫn Markdown
          </a>
        </div>
        <div className="guide-search search-box">
          <Search size={19} />
          <input
            type="search"
            aria-label="Tìm trong hướng dẫn"
            placeholder="Tìm: bán hàng, chuyển khoản, offline, lỗi…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="guide-result" role="status">
          {sections.length} / {guide.sections.length} mục hướng dẫn
          {query && ` khớp “${query}”`}
        </p>
        <div className="guide-layout">
          <aside className="guide-index">
            <h2>Mục lục</h2>
            <nav aria-label="Mục lục hướng dẫn">
              {sections.map((s) => (
                <button key={s.id} onClick={() => go(s.id)}>
                  {s.title}
                </button>
              ))}
            </nav>
          </aside>
          <label className="guide-mobile-index">
            Đi tới nội dung
            <select
              aria-label="Chọn mục hướng dẫn"
              value=""
              onChange={(e) => go(e.target.value)}
            >
              <option value="">Chọn một mục…</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <div className="guide-content">
            {sections.map((s) => (
              <section
                className="guide-section"
                id={`guide-${s.id}`}
                key={s.id}
              >
                <h2>{s.title}</h2>
                <p className="guide-section-intro">{s.intro}</p>
                <ol>
                  {s.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
                {s.example && <div className="guide-example">{s.example}</div>}
                {s.notes.length > 0 && (
                  <div className="guide-notes">
                    <h3>Cần nhớ</h3>
                    <ul>
                      {s.notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ))}
            {!sections.length && (
              <div className="empty">
                <BookOpen size={28} />
                <h2>Không tìm thấy mục phù hợp</h2>
                <p>Thử từ ngắn hơn hoặc bỏ dấu, ví dụ “cong no”, “offline”.</p>
                <button className="btn secondary" onClick={() => setQuery("")}>
                  Xem toàn bộ hướng dẫn
                </button>
              </div>
            )}
          </div>
        </div>
        <footer className="guide-footer">
          Hướng dẫn mô tả tính năng hiện có của bản chạy thử. Chính sách và
          thiết bị thực tế cần được chủ cửa hàng/người triển khai xác nhận trước
          vận hành.
        </footer>
      </main>
    </div>
  );
}
