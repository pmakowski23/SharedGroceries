import { Link, useRouterState } from "@tanstack/react-router";

const tabs = [
  {
    to: "/meal-planner" as const,
    label: "Planner",
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/recipes" as const,
    label: "Recipes",
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
      >
        <path d="M4 19h16M4 15h16M6.5 11A5.5 5.5 0 0112 5.5 5.5 5.5 0 0117.5 11H6.5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 2v3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/" as const,
    label: "Groceries",
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 01-8 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/meal-goals" as const,
    label: "Goals",
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
      >
        <path d="M12 2v20M2 12h20" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive =
            tab.to === "/"
              ? currentPath === "/"
              : currentPath.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.icon(isActive)}
              <span className={`text-xs mt-1 ${isActive ? "font-semibold" : ""}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
