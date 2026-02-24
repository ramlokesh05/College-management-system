import { Moon, Sun } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const ThemeToggle = () => {
  const { darkMode, toggleDarkMode } = useAuth();

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      className="glass-black-control rounded-xl p-2.5"
      aria-label="Toggle dark mode"
    >
      {darkMode ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
};

export default ThemeToggle;
