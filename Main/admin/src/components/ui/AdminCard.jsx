import './AdminCard.css';

export default function AdminCard({ children, className = '', title, headerActions, onClick }) {
  const cardClassName = `admin-card ${onClick ? 'interactive' : ''} ${className}`;
  
  return (
    <div className={cardClassName} onClick={onClick}>
      {(title || headerActions) && (
        <div className="admin-card-header">
          {title && <h3 className="admin-card-title">{title}</h3>}
          {headerActions && <div className="admin-card-actions">{headerActions}</div>}
        </div>
      )}
      <div className="admin-card-body">
        {children}
      </div>
    </div>
  );
}
