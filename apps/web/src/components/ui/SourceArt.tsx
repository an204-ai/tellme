/* Uiverse: Juanes200122 and preet_7613. MIT notices: /licenses/uiverse.txt */
export function LoaderArt() {
  return (
    <svg viewBox="0 0 240 240" height="240" width="240" className="pl">
      <circle
        strokeLinecap="round"
        strokeDashoffset="-330"
        strokeDasharray="0 660"
        strokeWidth="20"
        stroke="#000"
        fill="none"
        r="105"
        cy="120"
        cx="120"
        className="pl__ring pl__ring--a"
      ></circle>
      <circle
        strokeLinecap="round"
        strokeDashoffset="-110"
        strokeDasharray="0 220"
        strokeWidth="20"
        stroke="#000"
        fill="none"
        r="35"
        cy="120"
        cx="120"
        className="pl__ring pl__ring--b"
      ></circle>
      <circle
        strokeLinecap="round"
        strokeDasharray="0 440"
        strokeWidth="20"
        stroke="#000"
        fill="none"
        r="70"
        cy="120"
        cx="85"
        className="pl__ring pl__ring--c"
      ></circle>
      <circle
        strokeLinecap="round"
        strokeDasharray="0 440"
        strokeWidth="20"
        stroke="#000"
        fill="none"
        r="70"
        cy="120"
        cx="155"
        className="pl__ring pl__ring--d"
      ></circle>
    </svg>
  );
}
export function NotFoundArt() {
  return (
    <svg className="face" viewBox="0 0 320 380">
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="25"
      >
        <g className="face__eyes" transform="translate(0,112.5)">
          <g transform="translate(15,0)">
            <polyline
              className="face__eye-lid"
              points="37,0 0,120 75,120"
            ></polyline>
            <polyline
              className="face__pupil"
              points="55,120 55,155"
              strokeDasharray="35 35"
            ></polyline>
          </g>
          <g transform="translate(230,0)">
            <polyline
              className="face__eye-lid"
              points="37,0 0,120 75,120"
            ></polyline>
            <polyline
              className="face__pupil"
              points="55,120 55,155"
              strokeDasharray="35 35"
            ></polyline>
          </g>
        </g>
        <rect
          className="face__nose"
          x="132.5"
          y="112.5"
          width="55"
          height="155"
          rx="4"
          ry="4"
        ></rect>
        <g transform="translate(65,334)" strokeDasharray="102 102">
          <path className="face__mouth-left" d="M 0 30 C 0 30 40 0 95 0"></path>
          <path
            className="face__mouth-right"
            d="M 95 0 C 150 0 190 30 190 30"
          ></path>
        </g>
      </g>
    </svg>
  );
}
