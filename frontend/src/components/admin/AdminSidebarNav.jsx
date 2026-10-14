import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart3, FolderTree, Layers, GitBranch, Package, Tags, Receipt, Inbox, Building2,
  Users, UserCheck, ShieldAlert, BookOpen, Sparkles, Settings2, Image, FileText, LayoutList, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { visibleAdminNavigation } from '../../../../shared/adminNavigation.js';

const icons = { LayoutDashboard, BarChart3, FolderTree, Layers, GitBranch, Package, Tags, Receipt, Inbox, Building2,
  Users, UserCheck, ShieldAlert, BookOpen, Sparkles, Settings2, Image, FileText, LayoutList };
export default function AdminSidebarNav({ access, pendingKycCount, onNavigate }) {
  const { pathname } = useLocation();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const groups = visibleAdminNavigation(access, search);
  const renderLink = (item, nested = false) => {
    const Icon = icons[item.icon];
    const active = pathname === item.path || (!item.children?.length && !nested && pathname.startsWith(`${item.path}/`));
    return <Link key={item.path} to={item.path} onClick={onNavigate} aria-current={active ? 'page' : undefined}
      className={`flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs leading-5 font-medium transition-colors ${active ? 'bg-primary/8 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}>
      <Icon size={nested ? 14 : 16} className="shrink-0" /><span className="min-w-0 flex-1">{item.label}</span>
      {item.path === '/admin/dealers' && pendingKycCount > 0 && <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{pendingKycCount > 99 ? '99+' : pendingKycCount}</span>}
    </Link>;
  };
  return <>
    <div className="relative mb-4 shrink-0">
      <Search size={15} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
      <input aria-label="Search sidebar sections" placeholder="Find a section…" value={search} onChange={e => setSearch(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-muted/30 pl-9 pr-8 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
      {search && <button type="button" aria-label="Clear sidebar search" onClick={() => setSearch('')} className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:text-primary"><X size={14} /></button>}
    </div>
    <nav aria-label="Admin sections" className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 pr-1">
      {groups.map(group => {
        const open = !!search.trim() || !collapsed[group.label];
        return <section key={group.label} aria-label={group.label}>
          <button type="button" aria-expanded={open} onClick={() => setCollapsed(state => ({ ...state, [group.label]: !state[group.label] }))}
            className="mb-1 flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary">
            {group.label}<ChevronDown size={13} className={`shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
          </button>
          {open && <div className="space-y-0.5">{group.items.map(item => item.children?.length ? <div key={item.path}>
            <div className="flex items-center"><div className="min-w-0 flex-1">{renderLink(item)}</div><button type="button" aria-label="Toggle category hierarchy sub-menu" aria-expanded={!!search.trim() || categoriesOpen} onClick={() => setCategoriesOpen(value => !value)} className="rounded p-1.5 text-muted-foreground hover:text-primary">{search.trim() || categoriesOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button></div>
            {(search.trim() || categoriesOpen) && <div className="ml-4 border-l border-border pl-2">{item.children.map(child => renderLink(child, true))}</div>}
          </div> : renderLink(item))}</div>}
        </section>;
      })}
      {!groups.length && <div className="px-2 py-6 text-center text-xs leading-5 text-muted-foreground">{search.trim() ? 'No accessible sections match your search.' : 'No sections are available for this role.'}</div>}
    </nav>
  </>;
}
