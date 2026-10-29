import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IoLogoAndroid,
  IoDownloadOutline,
  IoShieldCheckmarkOutline,
  IoLocationOutline,
  IoSparklesOutline,
  IoCloudOfflineOutline,
  IoNotificationsOutline,
  IoLanguageOutline,
  IoCheckmarkCircleOutline,
  IoCopyOutline,
  IoCheckmarkOutline,
  IoSunnyOutline,
  IoMoonOutline,
  IoLockClosedOutline,
  IoPhonePortraitOutline,
  IoOpenOutline,
} from 'react-icons/io5';
import s from '../styles/Landing.module.css';

// Configurable APK download link via environment variable (falls back to /citivoice.apk or EAS build portal)
const DEFAULT_APK_URL =
  process.env.REACT_APP_APK_URL ||
  'https://expo.dev/accounts/erwin1229/projects/citivoice/builds/8245dfa8-1d7b-47b9-88c0-3700acd0d7e6';

const FEATURES = [
  {
    icon: <IoLocationOutline />,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.14)',
    title: 'GPS & Barangay Mapping',
    desc: 'Pin exact incident coordinates on an interactive map across all 32 barangays of Kabankalan City for accurate field dispatch.',
  },
  {
    icon: <IoSparklesOutline />,
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.14)',
    title: 'AI-Assisted Validation',
    desc: 'Smart category and priority classification with automatic photo-to-concern verification to prevent spam and mismatched reports.',
  },
  {
    icon: <IoCloudOfflineOutline />,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.14)',
    title: 'Offline-First Reporting',
    desc: 'Capture and queue civic concerns even without mobile data or Wi-Fi. Reports automatically sync once your connection returns.',
  },
  {
    icon: <IoNotificationsOutline />,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.14)',
    title: 'Real-Time Status & Proof',
    desc: 'Receive live updates as your report moves from Pending to In Progress to Resolved—complete with official completion photos.',
  },
  {
    icon: <IoLanguageOutline />,
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.14)',
    title: 'Multilingual Interface',
    desc: 'Designed for every Kabankalanon with full support for Hiligaynon, Filipino (Tagalog), and English.',
  },
  {
    icon: <IoShieldCheckmarkOutline />,
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.14)',
    title: 'Verified Citizen Identity',
    desc: 'Government ID verification protects community integrity and ensures every report comes from a real resident.',
  },
];

const INSTALL_STEPS = [
  {
    num: '1',
    title: 'Download the CitiVoice APK',
    desc: 'Tap the "Download Android APK" button on this page (or scan the QR code using your phone camera) to download the installer package.',
    tip: 'File format: CitiVoice.apk • Requires Android 8.0 or newer',
  },
  {
    num: '2',
    title: 'Allow Installation from Unknown Sources',
    desc: 'When your browser finishes downloading, tap Open on the file. If Android prompts you for permission, tap Settings and toggle on "Allow from this source" (Install unknown apps).',
    tip: 'Settings → Apps → Special App Access → Install Unknown Apps',
  },
  {
    num: '3',
    title: 'Install & Launch the App',
    desc: 'Tap "Install" on the confirmation dialog. If Google Play Protect shows a prompt for new civic builds, tap "More details" → "Install anyway", then tap "Open".',
    tip: 'Takes less than 10 seconds to install',
  },
  {
    num: '4',
    title: 'Register & Verify Your Identity',
    desc: 'Sign up with your email or Google account, select your Barangay in Kabankalan City, and upload a valid government ID to start submitting and tracking civic concerns.',
    tip: 'Grant Camera & Location permissions when prompted for reporting',
  },
];

export default function Landing({ theme = 'dark', onThemeToggle }) {
  const [copied, setCopied] = useState(false);

  const resolvedDownloadUrl = DEFAULT_APK_URL.startsWith('http')
    ? DEFAULT_APK_URL
    : `${window.location.origin}${DEFAULT_APK_URL}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
    resolvedDownloadUrl
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(resolvedDownloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={s.page}>
      {/* ── Top Navigation Bar ── */}
      <header className={s.navbar}>
        <div className={s.navContainer}>
          <div className={s.brand}>
            <img src="/logo.png" alt="CitiVoice Logo" className={s.brandLogo} />
            <div>
              <div className={s.brandName}>CitiVoice</div>
              <div className={s.brandSub}>Kabankalan City</div>
            </div>
          </div>

          <nav className={s.navLinks}>
            <span className={s.navLink} onClick={() => scrollToSection('features')}>
              Features
            </span>
            <span className={s.navLink} onClick={() => scrollToSection('install-guide')}>
              Download App
            </span>
            <span className={s.navLink} onClick={() => scrollToSection('install-guide')}>
              How to Install
            </span>
          </nav>

          <div className={s.navActions}>
            {onThemeToggle && (
              <button
                type="button"
                className={s.themeBtn}
                onClick={onThemeToggle}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <IoSunnyOutline /> : <IoMoonOutline />}
              </button>
            )}
            <Link to="/login" className={s.adminBtn}>
              <IoLockClosedOutline />
              <span>Admin Console</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className={s.hero}>
        <div>
          <div className={s.civicPill}>
            <IoShieldCheckmarkOutline size={15} />
            <span>City Government of Kabankalan • Citizen Engagement Portal</span>
          </div>

          <h1 className={s.heroTitle}>
            Empowering Kabankalanons Through{' '}
            <span className={s.heroHighlight}>Real-Time Civic Action</span>
          </h1>

          <p className={s.heroDesc}>
            Report road hazards, electrical outages, drainage blockages, and sanitation concerns
            directly from your smartphone. CitiVoice connects citizens and city administrators with
            GPS mapping, AI verification, and transparent resolution tracking.
          </p>

          <div className={s.heroCtaGroup}>
            <a
              href={DEFAULT_APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={s.primaryDownloadBtn}
            >
              <IoLogoAndroid size={20} />
              <span>Download Mobile App (.APK)</span>
              <IoDownloadOutline size={18} />
            </a>

            <button
              type="button"
              onClick={() => scrollToSection('install-guide')}
              className={s.secondaryGuideBtn}
            >
              <IoPhonePortraitOutline size={18} />
              <span>How to Install</span>
            </button>
          </div>

          <div className={s.heroMetaRow}>
            <div className={s.heroMetaItem}>
              <IoCheckmarkCircleOutline color="#10B981" size={16} />
              <span>Free for Kabankalan Citizens</span>
            </div>
            <div className={s.heroMetaItem}>
              <IoCheckmarkCircleOutline color="#10B981" size={16} />
              <span>Works Offline & Online</span>
            </div>
            <div className={s.heroMetaItem}>
              <IoCheckmarkCircleOutline color="#10B981" size={16} />
              <span>Hiligaynon • Filipino • English</span>
            </div>
          </div>
        </div>

        {/* Interactive Phone Preview Mockup */}
        <div className={s.phoneWrap}>
          <div className={s.phoneGlow} />
          <div className={s.phoneFrame}>
            <div className={s.phoneNotch} />
            <div className={s.phoneTopBar}>
              <div className={s.phoneBrand}>
                <img src="/logo.png" alt="Logo" className={s.phoneBrandLogo} />
                <div>
                  <div className={s.phoneBrandTitle}>CitiVoice</div>
                  <div className={s.phoneBrandSub}>Kabankalan City</div>
                </div>
              </div>
              <span className={s.phoneBadge}>● Verified</span>
            </div>

            <div className={s.phoneStatsRow}>
              <div className={s.phoneStatBox}>
                <div className={s.phoneStatNum} style={{ color: '#F59E0B' }}>
                  24/7
                </div>
                <div className={s.phoneStatLabel}>Intake</div>
              </div>
              <div className={s.phoneStatBox}>
                <div className={s.phoneStatNum} style={{ color: '#3B82F6' }}>
                  32
                </div>
                <div className={s.phoneStatLabel}>Barangays</div>
              </div>
              <div className={s.phoneStatBox}>
                <div className={s.phoneStatNum} style={{ color: '#10B981' }}>
                  Live
                </div>
                <div className={s.phoneStatLabel}>GPS Track</div>
              </div>
            </div>

            <div className={s.phoneReportCard}>
              <div className={s.phoneCardHeader}>
                <span
                  className={s.phoneStatusPill}
                  style={{ background: 'rgba(16,185,129,0.18)', color: '#34D399' }}
                >
                  ✓ Resolved
                </span>
                <span style={{ fontSize: 10, color: '#64748B' }}>Brgy. 1</span>
              </div>
              <div className={s.phoneCardTitle}>Streetlight Repaired Along Guanzon St.</div>
              <div className={s.phoneCardMeta}>
                <IoLocationOutline size={12} color="#F59E0B" />
                <span>Kabankalan City • Proof Attached</span>
              </div>
            </div>

            <div className={s.phoneReportCard}>
              <div className={s.phoneCardHeader}>
                <span
                  className={s.phoneStatusPill}
                  style={{ background: 'rgba(59,130,246,0.18)', color: '#60A5FA' }}
                >
                  ⟳ In Progress
                </span>
                <span style={{ fontSize: 10, color: '#64748B' }}>Brgy. Binicuil</span>
              </div>
              <div className={s.phoneCardTitle}>Drainage Declogging & Maintenance</div>
              <div className={s.phoneCardMeta}>
                <IoLocationOutline size={12} color="#F59E0B" />
                <span>Assigned to City Engineering</span>
              </div>
            </div>

            <div className={s.phoneCtaSim}>+ Report a Concern</div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className={s.section}>
        <div className={s.sectionHeader}>
          <div className={s.sectionEyebrow}>Platform Capabilities</div>
          <h2 className={s.sectionTitle}>Built for Fast, Accountable Public Service</h2>
          <p className={s.sectionSubtitle}>
            CitiVoice bridges the gap between citizens on the ground and Kabankalan City&apos;s
            response teams through smart mobile reporting and a centralized command console.
          </p>
        </div>

        <div className={s.featuresGrid}>
          {FEATURES.map((f, idx) => (
            <div key={idx} className={s.featureCard}>
              <div className={s.featureIcon} style={{ background: f.bg, color: f.color }}>
                {f.icon}
              </div>
              <h3 className={s.featureTitle}>{f.title}</h3>
              <p className={s.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mobile App Link & Installation Guide Section ── */}
      <section id="install-guide" className={s.installSection}>
        <div className={s.sectionHeader}>
          <div className={s.sectionEyebrow}>Mobile Application</div>
          <h2 className={s.sectionTitle}>Download & Install CitiVoice on Your Phone</h2>
          <p className={s.sectionSubtitle}>
            Follow the simple steps below to download the official CitiVoice Android application and
            install it on your smartphone.
          </p>
        </div>

        <div className={s.installGrid}>
          {/* Left: Direct Download & QR Code Card */}
          <div className={s.downloadCard}>
            <div className={s.downloadBadgeRow}>
              <span className={s.platformTag}>
                <IoLogoAndroid size={15} />
                <span>Android APK</span>
              </span>
              <span className={s.versionTag}>v1.0.0 • Android 8.0+</span>
            </div>

            <h3 className={s.downloadCardTitle}>CitiVoice Citizen Mobile App</h3>
            <p className={s.downloadCardDesc}>
              Get the latest standalone Android build of CitiVoice. Click the download button below
              directly from your mobile browser, or copy/scan the link to open it on your phone.
            </p>

            <a
              href={DEFAULT_APK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={s.downloadBtnFull}
            >
              <IoDownloadOutline size={20} />
              <span>Download CitiVoice for Android</span>
              <IoOpenOutline size={16} />
            </a>

            {/* Copyable Mobile App Link */}
            <div className={s.copyLinkRow}>
              <input
                type="text"
                readOnly
                value={resolvedDownloadUrl}
                className={s.copyLinkInput}
                aria-label="Mobile App Download Link"
              />
              <button type="button" onClick={handleCopyLink} className={s.copyBtn}>
                {copied ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <IoCheckmarkOutline /> Copied
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <IoCopyOutline /> Copy Link
                  </span>
                )}
              </button>
            </div>

            {/* QR Code for instant phone scanning */}
            <div className={s.qrBox}>
              <img src={qrCodeUrl} alt="Scan QR to download CitiVoice APK" className={s.qrImg} />
              <div>
                <div className={s.qrTextTitle}>Scan with Your Phone Camera</div>
                <div className={s.qrTextSub}>
                  Viewing this on a computer? Point your phone&apos;s camera or QR scanner at this
                  code to open the mobile app download link directly on your device.
                </div>
              </div>
            </div>
          </div>

          {/* Right: 4-Step Installation Instructions */}
          <div className={s.stepsList}>
            {INSTALL_STEPS.map((st) => (
              <div key={st.num} className={s.stepCard}>
                <div className={s.stepNumBadge}>{st.num}</div>
                <div className={s.stepContent}>
                  <h4 className={s.stepTitle}>{st.title}</h4>
                  <p className={s.stepDesc}>{st.desc}</p>
                  {st.tip && <span className={s.stepTip}>💡 {st.tip}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.brand}>
            <img src="/logo.png" alt="CitiVoice Logo" className={s.brandLogo} />
            <div>
              <div className={s.brandName}>CitiVoice — Kabankalan City</div>
              <div className={s.footerCopy}>
                Inspired by the golden sun of our democracy and the green growth of the Bangkal
                tree.
              </div>
            </div>
          </div>

          <div className={s.footerLinks}>
            <a href={DEFAULT_APK_URL} target="_blank" rel="noopener noreferrer">
              Download Mobile App
            </a>
            <Link to="/login">Administrator Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

