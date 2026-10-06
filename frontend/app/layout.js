import './style.css';
import DialogProvider from '../components/DialogProvider';
export const metadata = { title: 'CCTV Command Center' };
export default function Layout({ children }) { return <html><body><DialogProvider>{children}</DialogProvider></body></html>; }
