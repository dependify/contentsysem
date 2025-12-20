// Skip Link Component for Accessibility (f93)
// Provides keyboard users a way to skip navigation and jump to main content

export function SkipLink() {
    return (
        <a
            href="#main-content"
            className="
        sr-only 
        focus:not-sr-only 
        focus:absolute 
        focus:top-4 
        focus:left-4 
        focus:z-[100]
        focus:px-4 
        focus:py-2 
        focus:bg-indigo-600 
        focus:text-white 
        focus:rounded-lg
        focus:outline-none
        focus:ring-2
        focus:ring-indigo-400
        focus:ring-offset-2
        focus:ring-offset-gray-900
        transition-all
      "
        >
            Skip to main content
        </a>
    );
}

export default SkipLink;
