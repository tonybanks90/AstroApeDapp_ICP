const xButtonSvg = (white) => (
    <>
      {/* Left Border */}
      <svg
        className="absolute top-0 left-0"
        width="21"
        height="44"
        viewBox="0 0 21 44"
      >
        <path
          fill="none"
          stroke={white ? "white" : "url(#btn-left)"}
          strokeWidth="2"
          strokeLinejoin="round"
          d="M21,43 L1,43 L1,1 L21,1"
        />
      </svg>
  
      {/* Main Button Body */}
      <svg
        className="absolute top-0 left-[1.3125rem] w-[calc(100%-2.625rem)]"
        height="44"
        viewBox="0 0 100 44"
        preserveAspectRatio="none"
      >
        <rect
          x="0"
          y="0"
          width="100"
          height="44"
          rx="8" // Keeps rounded corners
          fill={white ? "white" : "none"}
          stroke={white ? "white" : "url(#btn-border)"}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
  
      {/* Right Border */}
      <svg
        className="absolute top-0 right-0"
        width="21"
        height="44"
        viewBox="0 0 21 44"
      >
        <path
          fill="none"
          stroke={white ? "white" : "url(#btn-right)"}
          strokeWidth="2"
          strokeLinejoin="round"
          d="M0,43 L20,43 L20,1 L0,1"
        />
      </svg>
    </>
  );
  
  export default xButtonSvg;