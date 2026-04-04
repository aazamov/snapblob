import { useState } from "react";
import "./index.css";
import GettingStarted from "./pages/GettingStarted";
import ImageAPI from "./pages/ImageAPI";
import VideoAPI from "./pages/VideoAPI";
import Frameworks from "./pages/Frameworks";
import Recipes from "./pages/Recipes";
import Playground from "./pages/Playground";

type Page = "getting-started" | "image-api" | "video-api" | "frameworks" | "recipes" | "playground";

interface NavItem {
  id: Page;
  label: string;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "getting-started", label: "Getting Started", group: "Guide" },
  { id: "image-api", label: "Image API", group: "API Reference" },
  { id: "video-api", label: "Video API", group: "API Reference" },
  { id: "frameworks", label: "Frameworks", group: "Integration" },
  { id: "recipes", label: "Recipes", group: "Integration" },
  { id: "playground", label: "Playground", group: "Try It" },
];

function groupItems(items: NavItem[]): { group: string; items: NavItem[] }[] {
  const groups: { group: string; items: NavItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.group === item.group) {
      last.items.push(item);
    } else {
      groups.push({ group: item.group, items: [item] });
    }
  }
  return groups;
}

const PAGES: Record<Page, React.FC> = {
  "getting-started": GettingStarted,
  "image-api": ImageAPI,
  "video-api": VideoAPI,
  frameworks: Frameworks,
  recipes: Recipes,
  playground: Playground,
};

export default function App() {
  const [page, setPage] = useState<Page>("getting-started");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const PageComponent = PAGES[page];
  const groups = groupItems(NAV_ITEMS);

  const navigate = (id: Page) => {
    setPage(id);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <div className="docs-layout">
      {/* Mobile hamburger */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        type="button"
        aria-label="Toggle navigation"
      >
        <span className="hamburger" />
      </button>

      {/* Sidebar */}
      <aside className={`docs-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-logo" onClick={() => navigate("getting-started")}>
            snapblob
          </h1>
          <span className="sidebar-version">v1.0.0-alpha</span>
        </div>

        <nav className="sidebar-nav">
          {groups.map((g) => (
            <div key={g.group} className="nav-group">
              <h3 className="nav-group-title">{g.group}</h3>
              {g.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${page === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="https://github.com/aazamov/snapblob" target="_blank" rel="noopener">
            GitHub
          </a>
          <a href="https://www.npmjs.com/package/snapblob" target="_blank" rel="noopener">
            npm
          </a>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="docs-main">
        <PageComponent />
      </main>
    </div>
  );
}
