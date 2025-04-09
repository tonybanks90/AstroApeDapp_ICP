import xButtonSvg from "../assets/svg/xButtonSvg";

const newButton = ({ className, href, onClick, children, px, white, target, rel }) => {
  const classes = `button relative inline-flex items-center justify-center h-11 w-auto px-7 
    transition-colors hover:text-color-1 rounded-lg ${white ? "text-n-8" : "text-n-1"} 
    ${className || ""} shadow-md`;

  const spanClasses = "relative z-10";

  const renderButton = () => (
    <button className={classes} onClick={onClick}>
      <span className={spanClasses}>{children}</span>
      {xButtonSvg(white)}
    </button>
  );

  const renderLink = () => (
    <a href={href} className={classes} target={target} rel={rel}>
      <span className={spanClasses}>{children}</span>
      {xButtonSvg(white)}
    </a>
  );

  return href ? renderLink() : renderButton();
};

export default newButton;
