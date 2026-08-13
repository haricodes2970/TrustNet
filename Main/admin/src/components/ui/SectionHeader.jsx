import './SectionHeader.css';

export default function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="section-header">
      <div className="section-header-content">
        <h1 className="section-header-title">{title}</h1>
        {subtitle && <p className="section-header-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="section-header-actions">{actions}</div>}
    </div>
  );
}
