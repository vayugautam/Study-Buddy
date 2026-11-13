import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import { PageHeading } from "../components/UI";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  function signOut() { logout(); navigate("/", { replace: true }); }
  return <>
    <PageHeading eyebrow="YOUR PROFILE" title="Account settings" description="Manage your Study Buddy session and see how your workspace is protected." />
    <section className="account-card"><div className="account-card-head"><span className="account-large-avatar">{(user?.email || "S").slice(0, 1).toUpperCase()}</span><div><span className="eyebrow">SIGNED IN AS</span><h2>{user?.email}</h2><p>Personal learning workspace</p></div></div><div className="account-detail-grid"><div className="account-detail"><span>Email address</span><strong>{user?.email}</strong></div><div className="account-detail"><span>Privacy</span><strong><Icon name="check" size={15} /> Your documents are account-scoped</strong></div></div><div className="account-session-note"><span className="feature-icon feature-icon-sage"><Icon name="user" size={19} /></span><p><strong>This browser session</strong><br />Your sign-in stays in this browser session. Signing out removes the saved access token from this tab.</p></div><button className="button button-light account-logout" onClick={signOut}><Icon name="logout" size={17} /> Sign out</button></section>
  </>;
}
