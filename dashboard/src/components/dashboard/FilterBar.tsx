import { useState } from "react";

interface FilterBarProps {
  onRoleChange: (role: string) => void;
  onDateRangeChange: (range: string) => void;
  onProjectChange: (project: string) => void;
}

const roles = ['All', 'Admin', 'Developer', 'Designer', 'Analyst', 'Viewer'];
const dateRanges = ['7d', '14d', '30d', '90d'];
const projectTypes = ['All', 'Web App', 'Mobile', 'API', 'Data Pipeline'];

const FilterBar = ({ onRoleChange, onDateRangeChange, onProjectChange }: FilterBarProps) => {
  const [activeRole, setActiveRole] = useState('All');
  const [activeDateRange, setActiveDateRange] = useState('30d');
  const [activeProject, setActiveProject] = useState('All');

  return (
    <div className="flex flex-wrap items-center gap-6 py-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Role</span>
        <div className="flex gap-1">
          {roles.map(role => (
            <button
              key={role}
              className={`filter-chip ${activeRole === role ? 'active' : ''}`}
              onClick={() => { setActiveRole(role); onRoleChange(role); }}
            >
              {role}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Period</span>
        <div className="flex gap-1">
          {dateRanges.map(range => (
            <button
              key={range}
              className={`filter-chip ${activeDateRange === range ? 'active' : ''}`}
              onClick={() => { setActiveDateRange(range); onDateRangeChange(range); }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-display">Project</span>
        <div className="flex gap-1">
          {projectTypes.map(project => (
            <button
              key={project}
              className={`filter-chip ${activeProject === project ? 'active' : ''}`}
              onClick={() => { setActiveProject(project); onProjectChange(project); }}
            >
              {project}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
