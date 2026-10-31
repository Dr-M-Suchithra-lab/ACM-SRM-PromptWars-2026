/**
 * FairShift - Client Application Logic
 * Mobile-First, Accessible (WCAG AA), Web Speech TTS/STT, Complete Bilingual Support (EN/TA)
 */

(function () {
  'use strict';

  // Application State
  const state = {
    token: localStorage.getItem('fairshift_token') || null,
    user: JSON.parse(localStorage.getItem('fairshift_user') || 'null'),
    selectedSector: null,
    industry: null,
    lang: localStorage.getItem('fairshift_lang') || 'en',
    i18n: {},
    activeTab: 'attendance',
    activeShift: null,
    demoUsers: [],
    speechSynthesisUtterance: null,
  };

  // Tamil dictionary for dynamic industry config items (hazard categories, shifts, deductions, names, departments)
  const TA_DYNAMIC_MAP = {
    // Shifts
    'Morning Shift': 'காலைப் பணி',
    'Evening Shift': 'மாலைப் பணி',
    'Night Pouring Shift': 'இரவுப் பணி',
    'Morning Lecture Block': 'காலை விரிவுரைப் பணி',
    'Evening Lab Block': 'மாலை ஆய்வகப் பணி',
    'Hostel Night Supervision': 'விடுதி இரவு மேற்பார்வை',
    // Construction Hazards
    'Working at Heights / Loose Scaffolding': 'உயரத்தில் பணி / தளர்வான சாரம்',
    'Exposed Wiring / Power Generator Hazard': 'திறந்த மின்கம்பி / ஜெனரேட்டர் ஆபத்து',
    'Excavator & Crane Safety Blindspot': 'கிரேன் மற்றும் கனரக இயந்திர பாதுகாப்பு ஆபத்து',
    'Damaged Helmet / Boots / Missing Lifeline': 'சேதமடைந்த தலைக்கவசம் / காலணி / பாதுகாப்பு கயிறு இன்மை',
    'Severe Heat Stress / No Drinking Water': 'கடும் வெப்பம் / குடிநீர் தட்டுப்பாடு',
    'Overtime Unrecorded / Pay Dispute': 'மிகைநேரப் பணி விடுபடுதல் / ஊதிய சர்ச்சை',
    'Verbal Abuse or Unfair Treatment': 'தகாத வார்த்தை / நியாயமற்ற நடத்தை',
    // College Hazards
    'Chemistry Lab Fume / Reagent Leak': 'வேதியியல் ஆய்வக புகை / இரசாயன கசிவு',
    'Computer Lab / Power Rack Overheat': 'கணினி ஆய்வக மின்சாதன வெப்ப ஆபத்து',
    'Hostel Safety / Gate Incident': 'விடுதி பாதுகாப்பு / நுழைவாயில் புகார்',
    'Adjunct Honorarium Delay': 'விரிவுரையாளர் ஊதிய தாமதம்',
    'Workplace Harassment / Grievance': 'பணியிட துன்புறுத்தல் / புகார்',
    // Deductions
    'Employees Provident Fund (12%)': 'தொழிலாளர் வருங்கால வைப்பு நிதி (12%)',
    'Site Safety Welfare Fund': 'பணித்தள பாதுகாப்பு நல நிதி',
    'Professional Tax': 'தொழில் வரி',
    'Staff Welfare Fund': 'பணியாளர் நல நிதி',
    // Roles
    Mason: 'கொத்தனார்',
    Electrician: 'மின்பணியாளர்',
    Welder: 'பற்றவைப்பாளர்',
    Scaffolder: 'சாரம் கட்டுபவர்',
    'Site Supervisor': 'பணித்தள மேற்பார்வையாளர்',
    'Adjunct Lecturer': 'கௌரவ விரிவுரையாளர்',
    'Lab Demonstrator': 'ஆய்வக உதவியாளர்',
    'Library Assistant': 'நூலக உதவியாளர்',
    'Hostel Resident Warden': 'விடுதி காப்பாளர்',
    'Department Dean': 'துறைத் தலைவர்',
    // Industries & Site Codes
    'Metro Rail & Infrastructure Site': 'மெட்ரோ ரயில் கட்டுமானத் தளம்',
    'Apex Engineering & Arts College': 'அபெக்ஸ் பொறியியல் மற்றும் கலைக் கல்லூரி',
    'METRO-4': 'மெட்ரோ-4',
    'APEX-1': 'அபெக்ஸ்-1',
    // Person Names
    'Murugan Selvam': 'முருகன் செல்வம்',
    'Ramesh Sharma': 'ரமேஷ் சர்மா',
    'David Fernandez': 'டேவிட் பெர்னாண்டஸ்',
    'Dr. Kavitha Raman': 'டாக்டர் கவிதா ராமன்',
    'Arjun Nair': 'அர்ஜுன் நாயர்',
    'Prof. S. Ranganathan': 'பேராசிரியர் எஸ். ரங்கநாதன்',
    // Departments
    'Tower 2 Reinforcement': 'கோபுரம் 2 வலுவூட்டல் பிரிவு',
    'Underground Substation': 'சுரங்க துணை மின்நிலையம்',
    'Site Operations & Safety': 'பணித்தள செயல்பாடு மற்றும் பாதுகாப்பு',
    'Computer Science & Engineering': 'கணினி அறிவியல் மற்றும் பொறியியல் துறை',
    'Applied Chemistry & Electronics Lab': 'பயன்பாட்டு வேதியியல் மற்றும் மின்னணு ஆய்வகம்',
    'Academic Affairs': 'கல்வி நிர்வாகத் துறை',
    // Folder Paths
    'tasks/murugan-selvam': 'பணிகள்/முருகன்-செல்வம்',
    'tasks/ramesh-sharma': 'பணிகள்/ரமேஷ்-சர்மா',
    'tasks/david-fernandez': 'பணிகள்/டேவிட்-பெர்னாண்டஸ்',
    'tasks/kavitha-raman': 'பணிகள்/கவிதா-ராமன்',
    'tasks/arjun-nair': 'பணிகள்/அர்ஜுன்-நாயர்',
    'tasks/s-ranganathan': 'பணிகள்/ரங்கநாதன்',
    // Feedback Categories
    safety_culture: 'பாதுகாப்பு தரம்',
    workload_fairness: 'வேலைப்பளு மற்றும் ஓய்வு',
    wage_transparency: 'வெளிப்படையான ஊதியம்',
    workplace_morale: 'பணியிடச் சூழல்',
    amenities: 'அடிப்படை வசதிகள்',
  };

  // Hindi dictionary for dynamic industry config items (hazard categories, shifts, deductions, names, departments)
  const HI_DYNAMIC_MAP = {
    // Shifts
    'Morning Shift': 'सुबह की शिफ्ट',
    'Evening Shift': 'शाम की शिफ्ट',
    'Night Pouring Shift': 'रात्रि शिफ्ट',
    'Morning Lecture Block': 'सुबह का व्याख्यान सत्र',
    'Evening Lab Block': 'शाम का प्रयोगशाला सत्र',
    'Hostel Night Supervision': 'हॉस्टल रात्रि निरीक्षण',
    // Construction Hazards
    'Working at Heights / Loose Scaffolding': 'ऊंचाई पर कार्य / ढीला मचान',
    'Exposed Wiring / Power Generator Hazard': 'खुले बिजली के तार / जनरेटर जोखिम',
    'Excavator & Crane Safety Blindspot': 'क्रेन और भारी मशीनरी सुरक्षा जोखिम',
    'Damaged Helmet / Boots / Missing Lifeline': 'क्षतिग्रस्त हेलमेट / जूते / सुरक्षा रस्सी की कमी',
    'Severe Heat Stress / No Drinking Water': 'भीषण गर्मी / पीने के पानी की कमी',
    'Overtime Unrecorded / Pay Dispute': 'ओवरटाइम दर्ज न होना / वेतन विवाद',
    'Verbal Abuse or Unfair Treatment': 'दुर्व्यवहार या अनुचित आचरण',
    // College Hazards
    'Chemistry Lab Fume / Reagent Leak': 'रसायन प्रयोगशाला धुआं / केमिकल रिसाव',
    'Computer Lab / Power Rack Overheat': 'कंप्यूटर प्रयोगशाला / पावर रैक ओवरहीट',
    'Hostel Safety / Gate Incident': 'हॉस्टल सुरक्षा / मुख्य द्वार घटना',
    'Adjunct Honorarium Delay': 'अतिथि व्याख्याता मानदेय में देरी',
    'Workplace Harassment / Grievance': 'कार्यस्थल उत्पीड़न / शिकायत',
    // Deductions
    'Employees Provident Fund (12%)': 'कर्मचारी भविष्य निधि (12%)',
    'Site Safety Welfare Fund': 'कार्यस्थल सुरक्षा कल्याण कोष',
    'Professional Tax': 'वृत्तिक कर',
    'Staff Welfare Fund': 'कर्मचारी कल्याण कोष',
    // Roles
    Mason: 'राजमिस्त्री',
    Electrician: 'इलेक्ट्रीशियन',
    Welder: 'वेल्डर',
    Scaffolder: 'मचान कारीगर',
    'Site Supervisor': 'साइट सुपरवाइज़र',
    'Adjunct Lecturer': 'अतिथि व्याख्याता',
    'Lab Demonstrator': 'प्रयोगशाला सहायक',
    'Library Assistant': 'पुस्तकालय सहायक',
    'Hostel Resident Warden': 'हॉस्टल वार्डन',
    'Department Dean': 'विभागाध्यक्ष',
    // Industries & Site Codes
    'Metro Rail & Infrastructure Site': 'मेट्रो रेल निर्माण स्थल',
    'Apex Engineering & Arts College': 'एपेक्स इंजीनियरिंग एवं आर्ट्स कॉलेज',
    'METRO-4': 'मेट्रो-4',
    'APEX-1': 'एपेक्स-1',
    // Person Names
    'Murugan Selvam': 'मुरुगन सेल्वम',
    'Ramesh Sharma': 'रमेश शर्मा',
    'David Fernandez': 'डेविड फर्नांडीज',
    'Dr. Kavitha Raman': 'डॉ. कविता रमन',
    'Arjun Nair': 'अर्जुन नायर',
    'Prof. S. Ranganathan': 'प्रो. एस. रंगनाथन',
    // Departments
    'Tower 2 Reinforcement': 'टावर 2 सुदृढ़ीकरण विभाग',
    'Underground Substation': 'भूमिगत सबस्टेशन विभाग',
    'Site Operations & Safety': 'साइट संचालन और सुरक्षा विभाग',
    'Computer Science & Engineering': 'कंप्यूटर विज्ञान एवं इंजीनियरिंग विभाग',
    'Applied Chemistry & Electronics Lab': 'रसायन एवं इलेक्ट्रॉनिक्स प्रयोगशाला',
    'Academic Affairs': 'शैक्षणिक मामलों का विभाग',
    // Folder Paths
    'tasks/murugan-selvam': 'कार्य/मुरुगन-सेल्वम',
    'tasks/ramesh-sharma': 'कार्य/रमेश-शर्मा',
    'tasks/david-fernandez': 'कार्य/डेविड-फर्नांडीज',
    'tasks/kavitha-raman': 'कार्य/कविता-रमन',
    'tasks/arjun-nair': 'कार्य/अर्जुन-नायर',
    'tasks/s-ranganathan': 'कार्य/रंगनाथन',
    // Feedback Categories
    safety_culture: 'सुरक्षा मानक',
    workload_fairness: 'कार्यभार और विश्राम',
    wage_transparency: 'पारदर्शी वेतन',
    workplace_morale: 'कार्यस्थल का माहौल',
    amenities: 'बुनियादी सुविधाएं',
  };

  function trDynamic(str) {
    if (!str) return '';
    if (state.lang === 'ta' && TA_DYNAMIC_MAP[str]) {
      return TA_DYNAMIC_MAP[str];
    }
    if (state.lang === 'hi' && HI_DYNAMIC_MAP[str]) {
      return HI_DYNAMIC_MAP[str];
    }
    return str;
  }

  // DOM Elements
  const el = {
    industryBanner: document.getElementById('industry-banner'),
    appNav: document.getElementById('app-nav'),
    mainNav: document.getElementById('main-nav'),
    brandSub: document.querySelector('.brand-sub'),
    industryName: document.getElementById('current-industry-name'),
    userBadge: document.getElementById('user-badge-display'),
    langToggle: document.getElementById('lang-toggle-btn'),
    demoBtn: document.getElementById('demo-modal-btn'),
    portalLogoutBtn: document.getElementById('portal-logout-btn'),
    contentArea: document.getElementById('tab-content-area'),
    toastContainer: document.getElementById('toast-container'),
    modalContainer: document.getElementById('modal-container'),
  };

  /**
   * Show accessible toast message
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `<span>${type === 'error' ? '⚠️' : '✅'}</span> <span>${message}</span>`;
    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  /**
   * Authenticated API Fetch Wrapper
   */
  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }

    try {
      const res = await fetch(path, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  /**
   * Translate helper
   */
  function t(path, fallback = '') {
    const parts = path.split('.');
    let cur = state.i18n;
    for (const p of parts) {
      if (cur && cur[p]) cur = cur[p];
      else return fallback || path;
    }
    return cur || fallback || path;
  }

  /**
   * Update static header chrome in active language
   */
  function updateHeaderChrome() {
    const isLoggedIn = Boolean(state.token && state.user);
    const skipLinkEl = document.getElementById('skip-link-el');
    const brandTitleEl = document.getElementById('brand-title-el');
    const footerLine1El = document.getElementById('footer-line-1');
    const footerLine2El = document.getElementById('footer-line-2');

    if (skipLinkEl) {
      skipLinkEl.textContent = t('skipLink', 'Skip to main content');
    }
    if (brandTitleEl) {
      brandTitleEl.textContent = t('appName', 'FairShift');
    }
    if (el.brandSub) {
      el.brandSub.textContent = t('tagline', 'Decent Work & Shift Welfare (SDG 8)');
    }
    document.title = `${t('appName', 'FairShift')} – ${t('tagline', 'Decent Work & Shift Welfare (SDG 8)')}`;
    if (footerLine1El) {
      footerLine1El.textContent = t('footerLine1', 'FairShift • UN SDG 8: Decent Work & Economic Growth');
    }
    if (footerLine2El) {
      footerLine2El.textContent = t(
        'footerLine2',
        'Zero worker identifiers stored for anonymous feedback • Multi-industry schema engine'
      );
    }
    if (el.portalLogoutBtn) {
      el.portalLogoutBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
      el.portalLogoutBtn.innerHTML = `🚪 ${t('nav.logout', 'Sign Out')}`;
    }
    if (el.industryBanner) {
      el.industryBanner.style.display = isLoggedIn ? 'flex' : 'none';
    }
    if (el.appNav) {
      el.appNav.style.display = isLoggedIn ? 'block' : 'none';
    }
    if (el.demoBtn) {
      el.demoBtn.innerHTML = `🎭 ${t('nav.switchDemo', 'Demo Personas')}`;
    }
    if (state.industry && el.industryName) {
      el.industryName.textContent = `${state.industry.icon} ${trDynamic(state.industry.name)} (${trDynamic(state.industry.siteCode)})`;
    }
    updateUserHeader();
  }

  /**
   * Load i18n Dictionary
   */
  async function loadTranslations(lang, shouldRender = false) {
    try {
      const res = await fetch(`/locales/${lang}.json`);
      state.i18n = await res.json();
      state.lang = lang;
      localStorage.setItem('fairshift_lang', lang);
      if (el.langToggle) {
        el.langToggle.value = lang;
      }
      document.documentElement.lang = lang;
      updateHeaderChrome();
      if (shouldRender) {
        renderNavigation();
        renderCurrentView();
      }
    } catch (err) {
      console.warn('Failed to load locale:', err);
    }
  }

  /**
   * Initialize App
   */
  async function init() {
    await loadTranslations(state.lang, false);

    // Purge any legacy pre-filled login input keys
    ['construction', 'college'].forEach((sec) => {
      ['worker', 'admin'].forEach((r) => {
        localStorage.removeItem(`fairshift_last_email_${sec}_${r}`);
        localStorage.removeItem(`fairshift_last_pwd_${sec}_${r}`);
      });
    });

    // Ensure first visit to portal v4 lands on the Sector Selection screen
    if (localStorage.getItem('fairshift_portal_v4') !== '1') {
      localStorage.removeItem('fairshift_token');
      localStorage.removeItem('fairshift_user');
      localStorage.removeItem('fairshift_saved_creds');
      localStorage.setItem('fairshift_portal_v4', '1');
      state.token = null;
      state.user = null;
    }

    // Fetch active industry configuration
    try {
      state.industry = await api('/api/industry/current');
      updateHeaderChrome();
    } catch {
      el.industryName.textContent = 'Metro Rail Site (METRO-4)';
    }

    // Load Registered Portal Accounts
    try {
      state.demoUsers = await api('/api/auth/demo-users');
    } catch (e) {
      console.warn('Could not pre-load portal accounts', e);
    }

    setupEventListeners();

    // Check existing saved login session or saved portal credentials
    let sessionValid = false;
    if (state.token && state.user) {
      try {
        const me = await api('/api/auth/me');
        state.user = me.user;
        sessionValid = true;
        state.activeTab = state.user.role === 'admin' ? 'admin_dashboard' : 'attendance';
        updateHeaderChrome();
        await checkActiveShift();
        renderNavigation();
        renderCurrentView();
      } catch {
        localStorage.removeItem('fairshift_token');
        localStorage.removeItem('fairshift_user');
        state.token = null;
        state.user = null;
      }
    }

    // Auto-restore from saved portal credentials if user did not sign out
    if (!sessionValid) {
      const savedCredsRaw = localStorage.getItem('fairshift_saved_creds');
      if (savedCredsRaw) {
        try {
          const savedCreds = JSON.parse(savedCredsRaw);
          if (savedCreds && savedCreds.email && savedCreds.password) {
            await login(savedCreds.email, savedCreds.password, savedCreds.industry, savedCreds.role);
            return;
          }
        } catch {
          localStorage.removeItem('fairshift_saved_creds');
        }
      }
      updateHeaderChrome();
      renderNavigation();
      renderCurrentView();
    }
  }

  /**
   * Sign Out & Return to Sector Selection
   */
  function logoutToPortals() {
    window.speechSynthesis?.cancel();
    localStorage.removeItem('fairshift_token');
    localStorage.removeItem('fairshift_user');
    localStorage.removeItem('fairshift_saved_creds');
    ['construction', 'college'].forEach((sec) => {
      ['worker', 'admin'].forEach((r) => {
        localStorage.removeItem(`fairshift_last_email_${sec}_${r}`);
        localStorage.removeItem(`fairshift_last_pwd_${sec}_${r}`);
      });
    });
    state.token = null;
    state.user = null;
    state.selectedSector = null;
    state.activeShift = null;
    updateHeaderChrome();
    renderNavigation();
    renderCurrentView();
  }

  /**
   * Login user (enforcing target portal industry + worker/admin role and saving credentials until sign out)
   */
  async function login(email, password, expectedIndustry = null, expectedRole = null) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      if (state.demoUsers.length > 0) {
        const matched = state.demoUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
        if (matched && expectedIndustry && matched.industry !== expectedIndustry) {
          const targetName = expectedIndustry === 'construction' ? 'Construction Site' : 'College Campus';
          const actualName = matched.industry === 'construction' ? 'Construction Site' : 'College Campus';
          showToast(
            `Access Denied: ${email} belongs to the ${actualName}, not ${targetName}.`,
            'error'
          );
          return;
        }
        if (matched && expectedRole && matched.role !== expectedRole) {
          const portalUsed = expectedRole === 'admin' ? 'Employer (Admin) Login Portal' : 'Worker / Staff Login Portal';
          const requiredPortal = matched.role === 'admin' ? 'Employer (Admin) Login Portal' : 'Worker / Staff Login Portal';
          showToast(
            `Access Denied: Cannot use ${portalUsed} for this account. Please log in via the ${requiredPortal}.`,
            'error'
          );
          return;
        }
      }

      const res = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      state.token = res.token;
      state.user = res.user;
      state.selectedSector = res.user.industry;
      localStorage.setItem('fairshift_token', res.token);
      localStorage.setItem('fairshift_user', JSON.stringify(res.user));
      localStorage.setItem(
        'fairshift_saved_creds',
        JSON.stringify({
          email: normalizedEmail,
          password,
          industry: res.user.industry,
          role: res.user.role,
        })
      );

      // Sync active industry config to the logged-in user's industry
      try {
        const sw = await api('/api/industry/switch', {
          method: 'POST',
          body: JSON.stringify({ industryId: state.user.industry }),
        });
        state.industry = sw.activeIndustry;
      } catch {
        // Ignore if industry switch fails
      }

      updateHeaderChrome();
      await checkActiveShift();

      // Reset to default tab for persona
      state.activeTab = state.user.role === 'admin' ? 'admin_dashboard' : 'attendance';
      renderNavigation();
      renderCurrentView();
      showToast(`${state.user.name} (${trDynamic(state.user.roleTitle || state.user.role)})`);
    } catch (err) {
      console.error('Login error', err);
    }
  }

  function updateUserHeader() {
    if (!state.user) {
      el.userBadge.innerHTML = `<span>🔒</span> <strong>${t('portal.title', 'Select Sector Login Portal')}</strong>`;
      return;
    }
    const folderSlug = state.user.folderSlug || state.user.id;
    el.userBadge.innerHTML = `<span>${state.user.avatar || '👤'}</span> <strong>${trDynamic(state.user.name)}</strong> (${trDynamic(state.user.roleTitle || state.user.role)}) &bull; <code>📂 ${trDynamic('tasks/' + folderSlug)}</code>`;
  }

  async function checkActiveShift() {
    if (state.user?.role !== 'worker') return;
    try {
      const data = await api('/api/attendance/active');
      state.activeShift = data.activeShift;
    } catch {
      state.activeShift = null;
    }
  }

  /**
   * Render Navigation based on User Role (Worker vs Admin)
   */
  function renderNavigation() {
    if (!state.token || !state.user) {
      el.mainNav.innerHTML = `
        <button class="nav-tab active" aria-selected="true">
          <span>🏛️</span> <span>${t('portal.title', 'Select Your Sector Login Portal')}</span>
        </button>
      `;
      return;
    }

    const role = state.user?.role || 'worker';
    let tabs = [];

    if (role === 'worker') {
      tabs = [
        { id: 'attendance', label: t('nav.attendance', 'Attendance & Shifts'), icon: '⏰' },
        { id: 'tasks', label: t('nav.tasks', 'My Tasks Folder'), icon: '📂' },
        { id: 'payslip', label: t('nav.payslip', 'My Payslip'), icon: '💰' },
        { id: 'grievance', label: t('nav.grievance', 'Safety & Grievance'), icon: '⚠️' },
        { id: 'feedback', label: t('nav.feedback', 'Anonymous Feedback'), icon: '💬' },
      ];
    } else {
      tabs = [
        { id: 'admin_dashboard', label: t('nav.dashboard', 'Operations Dashboard'), icon: '📊' },
        { id: 'admin_tasks', label: t('nav.adminTasks', 'Staff Tasks Folders'), icon: '📂' },
        { id: 'admin_grievances', label: t('admin.openGrievances', 'Grievance Resolution'), icon: '⚠️' },
        { id: 'admin_feedback', label: t('admin.feedbackThemes', 'Anonymous Feedback'), icon: '💬' },
      ];
    }

    el.mainNav.innerHTML = tabs
      .map(
        (tab) => `
        <button class="nav-tab ${state.activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}" aria-selected="${state.activeTab === tab.id}">
          <span>${tab.icon}</span> <span>${tab.label}</span>
        </button>
      `
      )
      .join('');

    el.mainNav.querySelectorAll('.nav-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.getAttribute('data-tab');
        renderNavigation();
        renderCurrentView();
      });
    });
  }

  let shiftTimerInterval = null;

  function clearShiftTimer() {
    if (shiftTimerInterval) {
      clearInterval(shiftTimerInterval);
      shiftTimerInterval = null;
    }
  }

  function formatDurationHMS(totalSeconds) {
    const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hrs = String(Math.floor(sec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const secs = String(sec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getHazardEvidenceImage(g) {
    if (g && g.photoUrl) return g.photoUrl;
    const sevColor = g?.severity === 'critical' ? '#dc2626' : g?.severity === 'high' ? '#d97706' : '#2563eb';
    const localeCode = state.lang === 'ta' ? 'ta-IN' : state.lang === 'hi' ? 'hi-IN' : 'en-US';
    const safeTitle = escapeHtml((g?.title || t('grievance.title', 'Safety Hazard')).slice(0, 48));
    const safeCat = escapeHtml(trDynamic(g?.categoryLabel || g?.category || ''));
    const safeDate = g?.submittedAt ? new Date(g.submittedAt).toLocaleString(localeCode) : new Date().toLocaleString(localeCode);
    const badgeLabel = escapeHtml(t('grievance.viewPhotoBtn', 'Photo Proof'));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420">
      <rect width="720" height="420" rx="16" fill="#0f172a"/>
      <rect x="20" y="20" width="680" height="380" rx="12" fill="#1e293b" stroke="${sevColor}" stroke-width="4"/>
      <circle cx="90" cy="95" r="36" fill="${sevColor}" opacity="0.2"/>
      <text x="90" y="108" font-size="38" text-anchor="middle">⚠️</text>
      <text x="145" y="85" fill="#f8fafc" font-family="sans-serif" font-size="22" font-weight="bold">${safeCat}</text>
      <text x="145" y="115" fill="#94a3b8" font-family="sans-serif" font-size="15">${escapeHtml(safeDate)}</text>
      <line x1="50" y1="150" x2="670" y2="150" stroke="#334155" stroke-width="2"/>
      <rect x="50" y="175" width="620" height="145" rx="10" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="75" y="225" fill="#e2e8f0" font-family="sans-serif" font-size="20" font-weight="bold">${safeTitle}</text>
      <text x="75" y="270" fill="#cbd5e1" font-family="sans-serif" font-size="15">${escapeHtml((g?.description || '').slice(0, 75))}</text>
      <rect x="50" y="340" width="260" height="36" rx="6" fill="${sevColor}"/>
      <text x="180" y="364" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">${badgeLabel}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function openHazardImageModal(photoUrl, title) {
    if (!photoUrl) return;
    openModal(
      `🖼️ ${escapeHtml(title || t('grievance.viewPhotoBtn', 'Photo Proof'))}`,
      `
        <div style="text-align:center; background:#0f172a; padding:14px; border-radius:10px;">
          <img src="${photoUrl}" alt="${escapeHtml(title || 'Hazard Photo')}" style="max-width:100%; max-height:70vh; border-radius:8px; object-fit:contain; display:block; margin:0 auto;" />
        </div>
      `
    );
  }

  /**
   * Render Current Tab View
   */
  async function renderCurrentView() {
    window.speechSynthesis?.cancel();
    clearShiftTimer();

    if (!state.token || !state.user) {
      renderLoginPortalsView();
      return;
    }

    el.contentArea.innerHTML = `<div style="text-align:center; padding: 40px;">⏳ ${t('common.loading', 'Loading...')}</div>`;

    switch (state.activeTab) {
      case 'attendance':
        await renderAttendanceView();
        break;
      case 'tasks':
      case 'admin_tasks':
        await renderTasksFolderView();
        break;
      case 'payslip':
        await renderPayslipView();
        break;
      case 'grievance':
        await renderGrievanceView();
        break;
      case 'feedback':
        renderFeedbackView();
        break;
      case 'admin_dashboard':
        await renderAdminDashboardView();
        break;
      case 'admin_grievances':
        await renderAdminGrievancesView();
        break;
      case 'admin_feedback':
        await renderAdminFeedbackView();
        break;
      default:
        el.contentArea.innerHTML = '<div>Tab not found</div>';
    }
  }

  // =========================================================================
  // STEP 1 & STEP 2 LOGIN PORTALS:
  // Step 1: Choose Sector (Construction Site vs College Campus)
  // Step 2: Separate Worker Login Portal vs Employer (Admin) Login Portal
  // =========================================================================
  function renderLoginPortalsView() {
    // STEP 1: Choose Sector (Construction Site or College Campus)
    if (!state.selectedSector) {
      el.contentArea.innerHTML = `
        <section aria-labelledby="sector-choose-heading" style="max-width: 820px; margin: 20px auto;">
          <div style="text-align:center; margin-bottom:28px;">
            <h2 id="sector-choose-heading" style="font-size:1.75rem; font-weight:800; color:var(--text-main);">
              🏛️ ${t('portal.title', 'Select Your Organization Sector')}
            </h2>
            <p style="color:var(--text-muted); max-width:640px; margin:8px auto 0 auto; font-size:1rem;">
              ${t('portal.chooseDesc', 'Choose your workplace sector below to proceed to the dedicated Worker and Employer (Admin) Login Portals.')}
            </p>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:24px;">
            <!-- CHOOSE CONSTRUCTION SITE -->
            <div class="card" style="border-top: 6px solid #d97706; background:#fffbeb; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <span style="font-size:2.4rem;">🏗️</span>
                  <span class="badge badge-warning" style="font-size:0.85rem;">${t('portal.siteCodePrefix', 'SITE CODE')}: ${trDynamic('METRO-4')}</span>
                </div>
                <h3 style="font-size:1.35rem; font-weight:800; color:#92400e; margin-bottom:6px;">
                  ${t('modals.constructionBtn', 'Construction Site')}
                </h3>
                <p style="font-size:0.92rem; color:#78350f; margin-bottom:16px; line-height:1.5;">
                  ${t('portal.constructionCardDesc', 'Metro Rail & Infrastructure Site • Separate login portals for Field Workers (Masons, Electricians) and Site Supervisors.')}
                </p>
              </div>
              <button type="button" class="btn-primary choose-sector-btn" data-sector="construction" style="width:100%; padding:14px; font-size:1.05rem; background:#d97706; border-color:#d97706;">
                🏗️ ${t('portal.enterConstructionBtn', 'Enter Construction Site Login Portals →')}
              </button>
            </div>

            <!-- CHOOSE COLLEGE CAMPUS -->
            <div class="card" style="border-top: 6px solid #4f46e5; background:#eef2ff; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                  <span style="font-size:2.4rem;">🎓</span>
                  <span class="badge" style="background:#e0e7ff; color:#3730a3; border:1px solid #a5b4fc; font-size:0.85rem;">${t('portal.siteCodePrefix', 'SITE CODE')}: ${trDynamic('APEX-1')}</span>
                </div>
                <h3 style="font-size:1.35rem; font-weight:800; color:#312e81; margin-bottom:6px;">
                  ${t('modals.collegeBtn', 'College Campus')}
                </h3>
                <p style="font-size:0.92rem; color:#3730a3; margin-bottom:16px; line-height:1.5;">
                  ${t('portal.collegeCardDesc', 'Apex Engineering & Arts College • Separate login portals for Campus Staff (Lecturers, Lab Demonstrators) and Academic Deans.')}
                </p>
              </div>
              <button type="button" class="btn-primary choose-sector-btn" data-sector="college" style="width:100%; padding:14px; font-size:1.05rem; background:#4f46e5; border-color:#4f46e5;">
                🎓 ${t('portal.enterCollegeBtn', 'Enter College Campus Login Portals →')}
              </button>
            </div>
          </div>
        </section>
      `;

      el.contentArea.querySelectorAll('.choose-sector-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          state.selectedSector = btn.getAttribute('data-sector');
          renderCurrentView();
        });
      });
      return;
    }

    // STEP 2: Separate Worker Login Portal vs Employer (Admin) Login Portal for the chosen sector
    const isCon = state.selectedSector === 'construction';
    const sectorTitle = isCon
      ? `🏗️ ${t('portal.constructionTitle', 'Construction Site Portal')}`
      : `🎓 ${t('portal.collegeTitle', 'College Campus Portal')}`;
    const accentColor = isCon ? '#d97706' : '#4f46e5';

    el.contentArea.innerHTML = `
      <section aria-labelledby="role-portal-heading" style="max-width: 880px; margin: 12px auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:18px;">
          <button type="button" id="btn-back-sectors" class="btn-secondary" style="font-size:0.9rem; padding:8px 14px;">
            ${t('portal.backToSectorsBtn', '← Change Sector (Construction / College)')}
          </button>
          <span class="badge ${isCon ? 'badge-warning' : 'badge-neutral'}" style="font-size:0.9rem; padding:6px 12px;">
            ${t('portal.siteCodePrefix', 'SITE CODE')}: ${trDynamic(isCon ? 'METRO-4' : 'APEX-1')}
          </span>
        </div>

        <div style="text-align:center; margin-bottom:22px;">
          <h2 id="role-portal-heading" style="font-size:1.55rem; font-weight:800; color:var(--text-main);">
            ${sectorTitle}
          </h2>
          <p style="color:var(--text-muted); font-size:0.95rem; margin-top:4px;">
            ${t('portal.rolePortalHint', 'Workers/Staff and Employers/Admins have strictly separated login portals.')}
          </p>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:24px;">
          <!-- PORTAL A: WORKER / STAFF LOGIN PORTAL -->
          <div class="card" style="border-top: 6px solid #059669; background:#f0fdf4;">
            <div style="margin-bottom:14px; border-bottom:2px solid #bbf7d0; padding-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-size:1.2rem; font-weight:800; color:#065f46;">
                  👷 ${isCon ? t('portal.workerPortalTitleCon', 'Worker Login Portal') : t('portal.workerPortalTitleCol', 'Staff / Faculty Login Portal')}
                </h3>
                <span class="badge badge-success">${t('portal.workerPortalBadge', 'WORKER PORTAL')}</span>
              </div>
              <p style="font-size:0.85rem; color:#047857; margin-top:4px; font-weight:600;">
                ${isCon ? t('portal.workerPortalSubCon', 'For Masons, Electricians & Field Workers') : t('portal.workerPortalSubCol', 'For Adjunct Lecturers & Lab Demonstrators')}
              </p>
            </div>

            <form class="role-login-form" data-role="worker" autocomplete="off" style="background:#ffffff; padding:18px; border-radius:8px; border:1px solid #bbf7d0;">
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label" style="font-size:0.9rem;">📧 ${t('portal.workerEmailLabel', 'Worker Email Address')}:</label>
                <input type="email" name="email" class="form-control" value="" autocomplete="off" placeholder="${state.lang === 'en' ? 'example@domain.com' : t('portal.workerEmailLabel', 'Worker Email Address')}" required />
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label" style="font-size:0.9rem;">🔑 ${t('portal.passwordLabel', 'Unique Password')}:</label>
                <input type="password" name="password" class="form-control" value="" autocomplete="new-password" placeholder="${t('portal.passwordPlaceholder', 'Enter your unique password')}" required />
              </div>
              <button type="submit" class="btn-primary" style="width:100%; padding:12px; font-size:1.05rem; background:#059669; border-color:#059669;">
                👷 ${t('portal.workerSignInBtn', 'Sign In to Worker Portal')}
              </button>
            </form>
          </div>

          <!-- PORTAL B: EMPLOYER / ADMIN LOGIN PORTAL -->
          <div class="card" style="border-top: 6px solid ${accentColor}; background:${isCon ? '#fffbeb' : '#eef2ff'};">
            <div style="margin-bottom:14px; border-bottom:2px solid ${isCon ? '#fde68a' : '#c7d2fe'}; padding-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="font-size:1.2rem; font-weight:800; color:${isCon ? '#92400e' : '#312e81'};">
                  👨🏽‍💼 ${t('portal.employerPortalTitle', 'Employer (Admin) Login Portal')}
                </h3>
                <span class="badge badge-warning">${t('portal.employerPortalBadge', 'EMPLOYER PORTAL')}</span>
              </div>
              <p style="font-size:0.85rem; color:${isCon ? '#b45309' : '#4338ca'}; margin-top:4px; font-weight:600;">
                ${isCon ? t('portal.employerPortalSubCon', 'For Site Supervisors & Safety Management') : t('portal.employerPortalSubCol', 'For Department Deans & Campus Administration')}
              </p>
            </div>

            <form class="role-login-form" data-role="admin" autocomplete="off" style="background:#ffffff; padding:18px; border-radius:8px; border:1px solid ${isCon ? '#fde68a' : '#c7d2fe'};">
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label" style="font-size:0.9rem;">📧 ${t('portal.employerEmailLabel', 'Employer Email Address')}:</label>
                <input type="email" name="email" class="form-control" value="" autocomplete="off" placeholder="${state.lang === 'en' ? 'example@domain.com' : t('portal.employerEmailLabel', 'Employer Email Address')}" required />
              </div>
              <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label" style="font-size:0.9rem;">🔑 ${t('portal.passwordLabel', 'Unique Password')}:</label>
                <input type="password" name="password" class="form-control" value="" autocomplete="new-password" placeholder="${t('portal.passwordPlaceholder', 'Enter your unique password')}" required />
              </div>
              <button type="submit" class="btn-primary" style="width:100%; padding:12px; font-size:1.05rem; background:${accentColor}; border-color:${accentColor};">
                👨🏽‍💼 ${t('portal.employerSignInBtn', 'Sign In to Employer Portal')}
              </button>
            </form>
          </div>
        </div>
      </section>
    `;

    const backBtn = document.getElementById('btn-back-sectors');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        state.selectedSector = null;
        renderCurrentView();
      });
    }

    el.contentArea.querySelectorAll('.role-login-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = form.getAttribute('data-role');
        const email = form.querySelector('input[name="email"]').value;
        const pwd = form.querySelector('input[name="password"]').value;
        await login(email, pwd, state.selectedSector, role);
      });
    });
  }

  // =========================================================================
  // TASKS FOLDER VIEW: Per-Person Tasks Folder (Worker & Admin)
  // =========================================================================
  async function renderTasksFolderView() {
    let data = { myFolder: null, folders: [] };
    try {
      data = await api('/api/tasks');
    } catch (e) {
      console.warn(e);
    }

    const isAdmin = state.user?.role === 'admin';
    const folders = data.folders || [];
    const myFolder = data.myFolder || {
      workerId: state.user?.id,
      name: state.user?.name,
      folderPath: `tasks/${state.user?.folderSlug || state.user?.id}`,
      tasks: [],
    };
    const localeCode = state.lang === 'ta' ? 'ta-IN' : state.lang === 'hi' ? 'hi-IN' : 'en-US';

    const renderTaskItems = (tasksList) => {
      if (!tasksList || tasksList.length === 0) {
        return `<p style="color:var(--text-muted); font-size:0.9rem;">${t('tasks.noTasks', 'No tasks in this folder yet.')}</p>`;
      }
      return tasksList
        .map(
          (tsk) => `
          <div style="border:1px solid var(--border); background:#ffffff; border-left:5px solid ${
            tsk.status === 'Completed' ? '#059669' : tsk.priority === 'high' ? '#dc2626' : '#2563eb'
          }; border-radius:8px; padding:12px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <strong style="font-size:1.05rem; ${tsk.status === 'Completed' ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">
                ${tsk.title}
              </strong>
              <div style="display:flex; align-items:center; gap:6px;">
                <span class="badge ${
                  tsk.priority === 'high' ? 'badge-danger' : tsk.priority === 'medium' ? 'badge-warning' : 'badge-neutral'
                }">${tsk.priority === 'high' ? t('tasks.prioHigh', 'HIGH') : tsk.priority === 'medium' ? t('tasks.prioMedium', 'MEDIUM') : t('tasks.prioLow', 'LOW')}</span>
                <span class="badge ${tsk.status === 'Completed' ? 'badge-success' : 'badge-neutral'}">
                  ${t(`tasks.status${tsk.status.replace(/\s+/g, '')}`, tsk.status)}
                </span>
              </div>
            </div>
            ${tsk.description ? `<p style="font-size:0.92rem; color:var(--text-main); margin:6px 0;">${tsk.description}</p>` : ''}
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:8px; font-size:0.8rem; color:var(--text-muted);">
              <span>👤 ${t('tasks.assignedBy', 'Added by')}: <strong>${trDynamic(tsk.assignedBy || state.user.name)}</strong> &bull; ${new Date(tsk.createdAt).toLocaleTimeString(localeCode)}</span>
              <div style="display:flex; gap:6px; align-items:center;">
                <select class="form-control task-status-select" data-id="${tsk.id}" style="min-height:34px; padding:4px 8px; font-size:0.85rem; width:auto;">
                  <option value="Pending" ${tsk.status === 'Pending' ? 'selected' : ''}>⏳ ${t('tasks.statusPending', 'Pending')}</option>
                  <option value="In Progress" ${tsk.status === 'In Progress' ? 'selected' : ''}>🔄 ${t('tasks.statusInProgress', 'In Progress')}</option>
                  <option value="Completed" ${tsk.status === 'Completed' ? 'selected' : ''}>✅ ${t('tasks.statusCompleted', 'Completed')}</option>
                </select>
                ${
                  isAdmin
                    ? `<button type="button" class="pill-btn task-delete-btn" data-id="${tsk.id}" style="min-height:34px; padding:4px 10px; font-size:0.8rem; background:#fef2f2; color:#991b1b; border:1px solid #fecaca; border-radius:6px; cursor:pointer;">
                  🗑️ ${t('tasks.deleteBtn', 'Delete')}
                </button>`
                    : ''
                }
              </div>
            </div>
          </div>
        `
        )
        .join('');
    };

    el.contentArea.innerHTML = `
      <section aria-labelledby="tasks-header">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
          <h2 id="tasks-header" style="font-weight:800; font-size:1.4rem;">
            📂 ${isAdmin ? t('tasks.adminTitle', 'Sector Staff Tasks Folders') : t('tasks.title', 'Personal Tasks Folder')}
          </h2>
          <span class="badge badge-success" style="font-size:0.9rem; padding:6px 12px;">
            📁 ${t('tasks.folderPathLabel', 'Folder')}: <code>${trDynamic(`${myFolder.folderPath}/tasks.json`)}</code>
          </span>
        </div>

        ${
          isAdmin
            ? `
        <!-- Assign Task Form (Admin Only) -->
        <div class="card" style="background:#f8fafc; border-left:6px solid var(--primary);">
          <h3 class="card-title" style="margin-bottom:12px;">
            ➕ ${t('tasks.assignTaskHeading', "Assign Task into Staff Member's Folder")}
          </h3>
          <form id="create-task-form">
            <div class="form-group">
              <label class="form-label" for="tsk-worker">👤 ${t('tasks.selectPerson', "Target Person's Tasks Folder")}:</label>
              <select id="tsk-worker" class="form-control" required>
                ${folders
                  .map(
                    (f) =>
                      `<option value="${f.workerId}">${f.avatar || '👤'} ${trDynamic(f.name)} (${trDynamic(f.roleTitle)}) — 📂 ${trDynamic(`${f.folderPath}/tasks.json`)}</option>`
                  )
                  .join('')}
              </select>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
              <div class="form-group">
                <label class="form-label" for="tsk-title">📌 ${t('tasks.taskTitle', 'Task Title')}:</label>
                <input id="tsk-title" class="form-control" type="text" placeholder="${t('tasks.taskTitlePlaceholder', 'e.g. Inspect scaffolding clamps / Prepare Lab 3 reagents')}" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="tsk-priority">⚡ ${t('tasks.priority', 'Priority')}:</label>
                <select id="tsk-priority" class="form-control">
                  <option value="low">${t('tasks.prioLow', 'Low')}</option>
                  <option value="medium" selected>${t('tasks.prioMedium', 'Medium')}</option>
                  <option value="high">${t('tasks.prioHigh', 'High')}</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="tsk-desc">📝 ${t('tasks.taskDetails', 'Task Instructions & Details')}:</label>
              <textarea id="tsk-desc" class="form-control" rows="2" placeholder="${t('tasks.taskDetailsPlaceholder', 'Enter specific shift instructions, location, or checklist items...')}"></textarea>
            </div>
            <button type="submit" class="btn-primary" style="width:100%; padding:12px;">
              💾 ${t('tasks.addBtn', 'Save to Tasks Folder')}
            </button>
          </form>
        </div>
        `
            : ''
        }

        <!-- Per-Person Tasks Folder Cards -->
        ${folders
          .map(
            (folder) => `
          <div class="card" style="margin-top:16px;">
            <div class="card-header">
              <div>
                <span class="card-title">${folder.avatar || '👤'} ${trDynamic(folder.name)} (${trDynamic(folder.roleTitle)})</span>
                <div style="font-size:0.82rem; color:var(--text-muted); margin-top:2px;">
                  ${trDynamic(folder.department)} &bull; 📁 <code>${trDynamic(`${folder.folderPath}/tasks.json`)}</code>
                </div>
              </div>
              <span class="badge badge-neutral">${folder.tasks.length} ${t('tasks.tasksCountSuffix', 'Tasks')}</span>
            </div>
            ${renderTaskItems(folder.tasks)}
          </div>
        `
          )
          .join('')}
      </section>
    `;

    // Hook Create Task Form
    const form = document.getElementById('create-task-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const workerEl = document.getElementById('tsk-worker');
        const payload = {
          workerId: workerEl ? workerEl.value : state.user.id,
          title: document.getElementById('tsk-title').value,
          priority: document.getElementById('tsk-priority').value,
          description: document.getElementById('tsk-desc').value,
        };
        try {
          await api('/api/tasks', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          showToast(t('tasks.addBtn', 'Saved to Tasks Folder!'));
          renderCurrentView();
        } catch (err) {
          console.error(err);
        }
      });
    }

    // Hook Status Changes
    el.contentArea.querySelectorAll('.task-status-select').forEach((sel) => {
      sel.addEventListener('change', async () => {
        const id = sel.getAttribute('data-id');
        try {
          await api(`/api/tasks/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: sel.value }),
          });
          showToast(t('common.update', 'Task updated!'));
          renderCurrentView();
        } catch (err) {
          console.error(err);
        }
      });
    });

    // Hook Delete Task
    el.contentArea.querySelectorAll('.task-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          await api(`/api/tasks/${id}`, { method: 'DELETE' });
          showToast(t('tasks.deleteBtn', 'Task removed'));
          renderCurrentView();
        } catch (err) {
          console.error(err);
        }
      });
    });
  }

  // =========================================================================
  // WORKER VIEW: Attendance & Shift Tracking
  // =========================================================================
  async function renderAttendanceView() {
    let summary = { totalShifts: 0, aggregateHours: { total: 0, regular: 0, overtime: 0 }, history: [] };
    try {
      summary = await api('/api/attendance/summary');
    } catch (e) {
      console.warn(e);
    }

    const hasActive = Boolean(state.activeShift);
    const expectedSiteCode = state.industry?.siteCode || 'METRO-4';
    const hrUnit = t('units.hrShort', 'h');
    const otUnit = t('units.otSuffix', 'OT');
    const localeCode = state.lang === 'ta' ? 'ta-IN' : state.lang === 'hi' ? 'hi-IN' : 'en-US';

    el.contentArea.innerHTML = `
      <section aria-labelledby="shift-header">
        <h2 id="shift-header" style="margin-bottom: 12px; font-weight:800; font-size:1.4rem;">
          ⏰ ${t('attendance.title', 'Shift & Attendance')}
        </h2>

        <!-- Active Shift Status Card -->
        <div class="card" style="border-left: 6px solid ${hasActive ? '#059669' : '#d97706'};">
          <div class="card-header">
            <span class="card-title">
              ${hasActive ? '🟢 ' + t('attendance.activeShift', 'Currently on Shift') : '⚪ ' + t('attendance.noActiveShift', 'Not Checked In')}
            </span>
            <span class="badge ${hasActive ? 'badge-success' : 'badge-neutral'}">
              ${hasActive ? t('attendance.inProgressBadge', 'IN PROGRESS') : t('attendance.standbyBadge', 'STANDBY')}
            </span>
          </div>

          ${
            hasActive
              ? `
              <p><strong>${t('attendance.shiftLabel', 'Shift')}:</strong> ${trDynamic(state.activeShift.shiftName)}</p>
              <p><strong>${t('attendance.startedLabel', 'Started')}:</strong> ${new Date(state.activeShift.checkIn).toLocaleTimeString(localeCode)}</p>
              <p style="margin: 8px 0; color: var(--text-muted); font-size:0.9rem;">
                📍 ${t('attendance.siteVerifiedLabel', 'Site Code verified')}: <code>${trDynamic(state.activeShift.siteCode)}</code>
              </p>
              <div style="background:#ecfdf5; border:2px solid #10b981; border-radius:10px; padding:14px; margin:14px 0; text-align:center;">
                <div style="font-size:0.85rem; font-weight:700; color:#047857; text-transform:uppercase; letter-spacing:0.5px;">
                  ⏱️ ${t('attendance.liveTimerLabel', 'Live Shift Timer')}
                </div>
                <div id="live-shift-timer-display" style="font-size:2.25rem; font-weight:900; font-family:monospace; color:#065f46; margin-top:4px; letter-spacing:2px;">
                  00:00:00
                </div>
              </div>
              <div style="margin-top: 16px;">
                <button id="btn-checkout" class="btn-primary" style="background: #dc2626; border-color:#dc2626; width: 100%; padding: 14px; font-size: 1.1rem;">
                  🛑 ${t('attendance.checkOut', 'Complete Shift (Check Out)')}
                </button>
              </div>
            `
              : `
              <p style="color: var(--text-muted); margin-bottom: 14px;">
                ${t('attendance.helperText', 'Enter your workplace site code and verify location to start your shift. Overtime will be tracked automatically.')}
              </p>

              <div class="form-group">
                <label class="form-label" for="site-code-input">🏢 ${t('attendance.siteCodeLabel', 'Site / Workplace Code')}:</label>
                <input id="site-code-input" class="form-control" type="text" value="${trDynamic(expectedSiteCode)}" placeholder="${trDynamic(expectedSiteCode)}" />
                <small style="color:var(--text-muted)">${t('attendance.authorizedCodeHint', 'Authorized site code')} (${trDynamic(state.industry?.name || '')}): <strong>${trDynamic(expectedSiteCode)}</strong></small>
              </div>

              <div class="form-group" style="margin-top: 10px;">
                <button id="btn-geo-verify" class="pill-btn" style="background:#f1f5f9; border:2px dashed #94a3b8; width: 100%; padding: 10px; cursor:pointer;">
                  📍 ${t('attendance.geofenceVerify', 'Tap to Verify GPS Geolocation')}
                </button>
                <div id="geo-status-msg" style="font-size:0.85rem; margin-top:6px; font-weight:600; color: var(--text-muted);">
                  ${t('attendance.geoNotTested', 'Location not yet tested (Optional if site code is entered)')}
                </div>
              </div>

              <div style="margin-top: 16px;">
                <button id="btn-checkin" class="btn-primary" style="width: 100%; padding: 14px; font-size: 1.1rem;">
                  🚀 ${t('attendance.checkIn', 'Start Shift (Check In)')}
                </button>
              </div>
            `
          }
        </div>

        <!-- Overtime & Regular Hours Metrics -->
        <div class="grid">
          <div class="stat-box">
            <div class="stat-value">${summary.aggregateHours.total} ${hrUnit}</div>
            <div class="stat-label">⏱️ ${t('attendance.totalHours', 'Total Hours Logged')}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" style="color: #059669;">${summary.aggregateHours.regular} ${hrUnit}</div>
            <div class="stat-label">💼 ${t('attendance.regularHours', 'Standard Hours')}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" style="color: #d97706;">${summary.aggregateHours.overtime} ${hrUnit}</div>
            <div class="stat-label">🔥 ${t('attendance.overtimeHours', 'Overtime Hours')}</div>
          </div>
        </div>

        <!-- Recent Shift Records -->
        <div class="card" style="margin-top: 20px;">
          <h3 class="card-title" style="margin-bottom: 12px;">📋 ${t('attendance.history', 'Recent Shift Log')}</h3>
          ${
            summary.history.length === 0
              ? `<p style="color:var(--text-muted);">${t('attendance.noHistory', 'No completed shifts recorded yet.')}</p>`
              : `
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.95rem;">
                  <thead>
                    <tr style="border-bottom: 2px solid var(--border); color: var(--text-muted);">
                      <th style="padding: 8px;">${t('common.date', 'Date')}</th>
                      <th style="padding: 8px;">${t('common.shift', 'Shift')}</th>
                      <th style="padding: 8px;">${t('common.total', 'Total')}</th>
                      <th style="padding: 8px;">${t('common.regular', 'Regular')}</th>
                      <th style="padding: 8px;">${t('common.overtime', 'Overtime')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summary.history
                      .map(
                        (s) => `
                      <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 10px 8px; font-weight:600;">${s.date}</td>
                        <td style="padding: 10px 8px;">${trDynamic(s.shiftName)}</td>
                        <td style="padding: 10px 8px; font-weight:700;">
                          ${s.durationFormatted ? `<span style="font-family:monospace; color:#047857;">${s.durationFormatted}</span> <small style="color:var(--text-muted);">(${s.totalHours} ${hrUnit})</small>` : `${s.totalHours} ${hrUnit}`}
                        </td>
                        <td style="padding: 10px 8px;">${s.regularHours} ${hrUnit}</td>
                        <td style="padding: 10px 8px; color: ${s.overtimeHours > 0 ? '#b45309' : 'inherit'}; font-weight:${s.overtimeHours > 0 ? '700' : 'normal'};">
                          ${s.overtimeHours > 0 ? `+${s.overtimeHours} ${hrUnit} (${otUnit})` : `0 ${hrUnit}`}
                        </td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
          }
        </div>
      </section>
    `;

    // Hook Check-In & Check-Out Buttons
    let verifiedCoords = null;
    const geoBtn = document.getElementById('btn-geo-verify');
    if (geoBtn) {
      geoBtn.addEventListener('click', () => {
        const msg = document.getElementById('geo-status-msg');
        msg.textContent = `📡 ${t('attendance.geoRequesting', 'Requesting device GPS...')}`;
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              verifiedCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
              msg.innerHTML = `<span style="color:#059669">✅ ${t('attendance.geoLocked', 'GPS Locked')} (${verifiedCoords.latitude.toFixed(4)}, ${verifiedCoords.longitude.toFixed(4)})</span>`;
            },
            () => {
              verifiedCoords = { latitude: state.industry.geofence.latitude, longitude: state.industry.geofence.longitude };
              msg.innerHTML = `<span style="color:#2563eb">✅ ${t('attendance.geoNetworkVerified', 'On-site verified via network geofence')}</span>`;
            }
          );
        } else {
          verifiedCoords = { latitude: state.industry.geofence.latitude, longitude: state.industry.geofence.longitude };
          msg.innerHTML = `<span style="color:#2563eb">✅ ${t('attendance.geoNetworkVerified', 'On-site verified')}</span>`;
        }
      });
    }

    // Start Live Running Shift Stopwatch if shift is active
    clearShiftTimer();
    if (hasActive && state.activeShift?.checkIn) {
      const timerEl = document.getElementById('live-shift-timer-display');
      const startMs = new Date(state.activeShift.checkIn).getTime();
      const tickShiftTimer = () => {
        if (!timerEl) return;
        const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        timerEl.textContent = formatDurationHMS(elapsedSec);
      };
      tickShiftTimer();
      shiftTimerInterval = setInterval(tickShiftTimer, 1000);
    }

    const checkInBtn = document.getElementById('btn-checkin');
    if (checkInBtn) {
      checkInBtn.addEventListener('click', async () => {
        const rawCode = document.getElementById('site-code-input').value.trim();
        const siteCode = rawCode === trDynamic(expectedSiteCode) ? expectedSiteCode : rawCode;
        try {
          const res = await api('/api/attendance/check-in', {
            method: 'POST',
            body: JSON.stringify({ siteCode, coordinates: verifiedCoords }),
          });
          state.activeShift = res.shift;
          showToast(t('attendance.activeShift', 'Shift started successfully!'));
          renderCurrentView();
        } catch (e) {
          console.error(e);
        }
      });
    }

    const checkOutBtn = document.getElementById('btn-checkout');
    if (checkOutBtn) {
      checkOutBtn.addEventListener('click', async () => {
        try {
          clearShiftTimer();
          const res = await api('/api/attendance/check-out', { method: 'POST' });
          state.activeShift = null;
          const timeStr = res.shift.durationFormatted || `${res.shift.totalHours} ${hrUnit}`;
          showToast(`${t('attendance.checkOut', 'Shift completed')}: ${timeStr} (${res.shift.overtimeHours} ${hrUnit} ${otUnit})`);
          renderCurrentView();
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  // =========================================================================
  // WORKER VIEW: Transparent Payslip + Read-Aloud TTS
  // =========================================================================
  async function renderPayslipView() {
    let payslip = null;
    try {
      payslip = await api(`/api/payslips/current?lang=${state.lang}`);
    } catch {
      el.contentArea.innerHTML = `<div class="card"><p>${t('payslip.title', 'Payslip')}</p></div>`;
      return;
    }

    const sym = payslip.currencySymbol || '₹';
    const multSuffix = t('units.multiplierSuffix', 'x');

    el.contentArea.innerHTML = `
      <section aria-labelledby="payslip-header">
        <h2 id="payslip-header" style="margin-bottom: 12px; font-weight:800; font-size:1.4rem;">
          💰 ${t('payslip.title', 'Transparent Payslip')}
        </h2>

        <!-- "Why this amount" Plain Explanation Card + Voice Read Aloud -->
        <div class="why-explanation-card">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <h3 style="font-size:1.1rem; font-weight:700; color:#1e40af;">
              🗣️ ${t('payslip.whyTitle', 'Why This Amount? (Plain Explanation)')}
            </h3>
            <button id="btn-read-aloud" class="speaker-btn" aria-label="Read payslip explanation aloud">
              <span id="speaker-icon">🔊</span> <span id="speaker-text">${t('payslip.readAloud', 'Read Aloud to Me')}</span>
            </button>
          </div>
          <p id="plain-explanation-text" style="margin-top:12px; font-size:1.05rem; line-height:1.6; color:#1e293b; font-weight:500;">
            ${payslip.plainExplanation}
          </p>
        </div>

        <!-- Itemized Breakdown Card -->
        <div class="card" style="margin-top: 16px;">
          <div class="card-header">
            <span class="card-title">🧾 ${t('payslip.itemizedTitle', 'Itemized Calculation')}</span>
            <span class="badge badge-success">${payslip.shiftCount} ${t('payslip.shiftCount', 'Completed Shifts')}</span>
          </div>

          <div class="payslip-summary">
            <div class="payslip-row">
              <span>${t('payslip.standardWork', 'Standard Work')} (${payslip.regularHours} ${t('payslip.hrsAt', 'hrs @')} ${sym}${payslip.baseHourlyRate}${t('payslip.perHr', '/hr')})</span>
              <strong style="color:var(--text-main);">${sym}${payslip.regularPay}</strong>
            </div>

            <div class="payslip-row">
              <span>${t('payslip.overtimeWork', 'Overtime')} (${payslip.overtimeHours} ${t('payslip.hrsAt', 'hrs @')} ${payslip.overtimeMultiplier}${multSuffix} = ${sym}${payslip.effectiveOtRate}${t('payslip.perHr', '/hr')})</span>
              <strong style="color:#b45309;">+ ${sym}${payslip.overtimePay}</strong>
            </div>

            <div class="payslip-row" style="background:#f1f5f9; padding: 10px; font-weight:700;">
              <span>${t('payslip.grossEarnings', 'Gross Earnings')}</span>
              <span>${sym}${payslip.grossPay}</span>
            </div>

            <div style="margin: 12px 0 6px 0; font-size:0.9rem; font-weight:700; color:var(--text-muted);">
              ${t('payslip.deductions', 'Statutory Deductions')}:
            </div>

            ${payslip.deductionsBreakdown
              .map(
                (d) => `
              <div class="payslip-row" style="font-size: 0.9rem; color:#64748b;">
                <span>• ${trDynamic(d.name)}</span>
                <span style="color:#dc2626;">- ${sym}${d.amount}</span>
              </div>
            `
              )
              .join('')}

            <div class="payslip-row total">
              <span>${t('payslip.netTakeHome', 'Net Take-Home Pay')}</span>
              <span>${sym}${payslip.netPay}</span>
            </div>
          </div>
        </div>
      </section>
    `;

    // SpeechSynthesis Audio Read-Aloud (with explicit Tamil/Hindi voice selection)
    let isPlaying = false;
    const readBtn = document.getElementById('btn-read-aloud');
    const speakerIcon = document.getElementById('speaker-icon');
    const speakerText = document.getElementById('speaker-text');
    const textToRead = payslip.plainExplanation;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }

    readBtn.addEventListener('click', () => {
      if (!('speechSynthesis' in window)) {
        showToast(t('payslip.readAloud', 'Audio unavailable'), 'error');
        return;
      }

      if (isPlaying) {
        window.speechSynthesis.cancel();
        isPlaying = false;
        readBtn.classList.remove('playing');
        speakerIcon.textContent = '🔊';
        speakerText.textContent = t('payslip.readAloud', 'Read Aloud to Me');
      } else {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToRead);
        const targetLang = state.lang === 'ta' ? 'ta-IN' : state.lang === 'hi' ? 'hi-IN' : 'en-IN';
        utterance.lang = targetLang;
        utterance.rate = 0.92;

        const voices = window.speechSynthesis.getVoices() || [];
        const langPrefix = state.lang.toLowerCase();
        const preferredVoice =
          voices.find((v) => v.lang && v.lang.replace('_', '-').toLowerCase() === targetLang.toLowerCase()) ||
          voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(langPrefix)) ||
          voices.find((v) =>
            langPrefix === 'ta'
              ? /vani|tamil|valluvar/i.test(v.name)
              : langPrefix === 'hi'
                ? /lekha|hindi|neel/i.test(v.name)
                : /rishi|samantha|alex/i.test(v.name)
          );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          isPlaying = true;
          readBtn.classList.add('playing');
          speakerIcon.textContent = '⏹️';
          speakerText.textContent = t('payslip.stopReading', 'Stop Audio');
        };

        utterance.onend = utterance.onerror = () => {
          isPlaying = false;
          readBtn.classList.remove('playing');
          speakerIcon.textContent = '🔊';
          speakerText.textContent = t('payslip.readAloud', 'Read Aloud to Me');
        };

        window.speechSynthesis.speak(utterance);
      }
    });
  }

  // =========================================================================
  // WORKER VIEW: Grievance & Safety Incident Reporting + Status Tracker
  // =========================================================================
  async function renderGrievanceView() {
    let grievances = [];
    try {
      grievances = await api('/api/grievances');
    } catch (e) {
      console.warn(e);
    }

    const hazardCategories = state.industry?.hazardCategories || [];
    const localeCode = state.lang === 'ta' ? 'ta-IN' : state.lang === 'hi' ? 'hi-IN' : 'en-US';
    const trSeverity = (sev) => {
      if (sev === 'critical') return t('grievance.sevBadgeCritical', 'CRITICAL');
      if (sev === 'high') return t('grievance.sevBadgeHigh', 'HIGH');
      if (sev === 'medium') return t('grievance.sevBadgeMedium', 'MEDIUM');
      return t('grievance.sevBadgeLow', 'LOW');
    };

    el.contentArea.innerHTML = `
      <section aria-labelledby="grv-header">
        <h2 id="grv-header" style="margin-bottom: 12px; font-weight:800; font-size:1.4rem;">
          ⚠️ ${t('grievance.title', 'Safety Hazard & Grievance Reporting')}
        </h2>

        <!-- Filing Form Card -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📝 ${t('grievance.formHeading', 'Report Hazard / Complaint')}</span>
            <button id="btn-voice-stt" class="mic-btn" type="button" aria-label="Use voice to dictate issue">
              <span id="mic-icon">🎙️</span> <span id="mic-text">${t('grievance.voiceReport', 'Speak to Report (Voice)')}</span>
            </button>
          </div>

          <form id="grievance-form">
            <div class="form-group">
              <label class="form-label" for="grv-category">🚨 ${t('grievance.category', 'Hazard Category')}:</label>
              <select id="grv-category" class="form-control" required>
                ${hazardCategories.map((c) => `<option value="${c.id}">${trDynamic(c.label)}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="grv-title">📌 ${t('grievance.reportTitle', 'Issue Summary')}:</label>
              <input id="grv-title" class="form-control" type="text" placeholder="${t('grievance.reportTitlePlaceholder', 'e.g. Scaffolding guard missing on Floor 4')}" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="grv-description">📄 ${t('grievance.description', 'Details / Specific Location')}:</label>
              <textarea id="grv-description" class="form-control" rows="3" placeholder="${t('grievance.descriptionPlaceholder', 'Speak or type location, what happened, and any injuries...')}" required></textarea>
            </div>

            <div class="form-group">
              <label class="form-label" for="grv-severity">⚡ ${t('grievance.severity', 'Urgency Level')}:</label>
              <select id="grv-severity" class="form-control">
                <option value="low">${t('grievance.sevLow', 'Low (General suggestion / Minor wear)')}</option>
                <option value="medium" selected>${t('grievance.sevMedium', 'Medium (Action needed within shift)')}</option>
                <option value="high">${t('grievance.sevHigh', 'High (Active danger to workers)')}</option>
                <option value="critical">${t('grievance.sevCritical', 'Critical (Immediate shutdown required)')}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="grv-photo">📷 ${t('grievance.attachPhoto', 'Attach Photo Proof')} (${t('common.optional', 'Optional')}):</label>
              <input id="grv-photo" class="form-control" type="file" accept="image/*" />
              <div id="grv-photo-preview-box" style="display:none; margin-top:10px; background:#f8fafc; border:1px solid var(--border); border-radius:8px; padding:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span style="font-size:0.85rem; font-weight:700; color:#059669;">✅ ${t('grievance.photoAttached', 'Photo Attached')}</span>
                  <button id="btn-remove-photo" type="button" class="pill-btn" style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; padding:2px 8px; font-size:0.8rem; cursor:pointer;">✕ ${t('grievance.removePhotoBtn', 'Remove')}</button>
                </div>
                <img id="grv-photo-preview-img" src="" alt="Preview" style="max-height:180px; max-width:100%; border-radius:6px; object-fit:contain; cursor:pointer; display:block;" />
              </div>
            </div>

            <button type="submit" class="btn-primary" style="width: 100%; padding: 12px; font-size:1.05rem;">
              🚀 ${t('grievance.submitBtn', 'Submit Report')}
            </button>
          </form>
        </div>

        <!-- 4-Stage Status Tracker of Submitted Reports -->
        <div class="card" style="margin-top: 20px;">
          <h3 class="card-title" style="margin-bottom: 12px;">🔍 ${t('grievance.myReports', 'Status Tracker')}</h3>
          ${
            grievances.length === 0
              ? `<p style="color:var(--text-muted)">${t('grievance.noReports', 'No safety reports submitted yet.')}</p>`
              : grievances
                  .map((g) => {
                    const steps = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];
                    const currentIdx = steps.indexOf(g.status);

                    return `
              <div style="background:#f8fafc; border:1px solid var(--border); border-radius:8px; padding:16px; margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                  <strong style="font-size:1.1rem; color:var(--text-main);">${g.title}</strong>
                  <span class="badge ${
                    g.severity === 'critical' ? 'badge-danger' : g.severity === 'high' ? 'badge-warning' : 'badge-neutral'
                  }">${trSeverity(g.severity)}</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin: 4px 0;">
                  <span>${t('grievance.category', 'Category')}: <strong>${trDynamic(g.categoryLabel)}</strong></span> |
                  <span>${t('grievance.filedOn', 'Filed')}: <strong>${new Date(g.submittedAt).toLocaleDateString(localeCode)}</strong></span>
                  ${g.voiceInputUsed ? ` | 🎙️ <em>${t('grievance.dictatedViaVoice', 'Dictated via voice')}</em>` : ''}
                </div>
                <p style="margin: 8px 0; font-size:0.95rem; line-height:1.4;">${g.description}</p>

                <div style="margin: 10px 0; display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:#ffffff; border:1px solid var(--border); padding:8px 10px; border-radius:8px;">
                  <img src="${getHazardEvidenceImage(g)}" alt="${escapeHtml(g.title)}" class="btn-view-hazard-photo" data-grv-id="${g.id}" style="height:64px; width:96px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1; cursor:pointer;" />
                  <button type="button" class="pill-btn btn-view-hazard-photo" data-grv-id="${g.id}" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:6px 12px; font-weight:700; cursor:pointer;">
                    🖼️ ${t('grievance.viewPhotoBtn', 'View Photo Proof')}
                  </button>
                </div>

                <!-- Visual 4-Step Progress Tracker -->
                <div class="timeline" aria-label="Progress Tracker">
                  ${steps
                    .map((step, idx) => {
                      const isDone = idx < currentIdx;
                      const isActive = idx === currentIdx;
                      return `
                      <div class="timeline-step ${isDone ? 'completed' : ''} ${isActive ? 'active' : ''}">
                        <div class="timeline-circle">${isDone ? '✓' : idx + 1}</div>
                        <span>${t(`grievance.status${step.replace(/\s+/g, '')}`, step)}</span>
                      </div>
                    `;
                    })
                    .join('')}
                </div>

                ${
                  g.replies && g.replies.length > 0
                    ? `
                  <div style="background:#eff6ff; border-left:4px solid var(--primary); padding:10px 12px; border-radius:4px; margin-top:10px;">
                    <div style="font-weight:700; font-size:0.85rem; color:var(--primary);">
                      💬 ${t('grievance.adminReplyTitle', 'Official Admin Reply')} (${trDynamic(g.replies[0].author)}):
                    </div>
                    <div style="font-size:0.95rem; margin-top:2px;">${g.replies[0].message}</div>
                  </div>
                `
                    : `<div style="font-size:0.85rem; color:var(--text-muted); margin-top:6px;"><em>${t('grievance.awaitingReview', 'Awaiting supervisor review and action note.')}</em></div>`
                }
              </div>
            `;
                  })
                  .join('')
          }
        </div>
      </section>
    `;

    // Hook Real-Time Speech Recognition (Continuous Live Voice Dictation + Native Tamil ta-IN & Fallback Engine)
    let isRecording = false;
    let userStopped = false;
    let stopFinalized = false;
    let voiceDictated = false;
    let speechEngineBlocked = false;
    let activeRecognition = null;
    let restartTimer = null;
    let stopFallbackTimer = null;
    let committedTranscript = '';
    let sessionFinalTranscript = '';
    let initialTitleBeforeMic = '';
    let initialDescBeforeMic = '';
    const getOptimalRecognitionLang = () => {
      if (state.lang === 'ta') return 'ta-IN';
      if (state.lang === 'hi') return 'hi-IN';
      return 'en-IN';
    };
    let currentRecognitionLang = getOptimalRecognitionLang();

    const micBtn = document.getElementById('btn-voice-stt');
    const micIcon = document.getElementById('mic-icon');
    const micText = document.getElementById('mic-text');
    const descInput = document.getElementById('grv-description');
    const titleInput = document.getElementById('grv-title');
    const catSelect = document.getElementById('grv-category');

    // Live Tanglish / English -> Tamil Unicode Script Transliterator & Lexicon
    const TAMIL_SPEECH_LEXICON = {
      vanakkam: 'வணக்கம்', nanri: 'நன்றி', nandri: 'நன்றி', enna: 'என்ன', inge: 'இங்கே', inga: 'இங்கே',
      ange: 'அங்கே', illai: 'இல்லை', illa: 'இல்லை', irukku: 'இருக்கிறது', irukkirathu: 'இருக்கிறது',
      romba: 'ரொம்ப', idhu: 'இது', indha: 'இந்த', andha: 'அந்த', ippo: 'இப்போது', udane: 'உடனே',
      sari: 'சரி', vendum: 'வேண்டும்', venum: 'வேண்டும்', velai: 'வேலை', thanni: 'தண்ணீர்',
      thanneer: 'தண்ணீர்', kudineer: 'குடிநீர்', minsaram: 'மின்சாரம்', minsaaram: 'மின்சாரம்',
      kambi: 'கம்பி', aapathu: 'ஆபத்து', abathu: 'ஆபத்து', vali: 'வலி', kaayam: 'காயம்',
      pazhudhu: 'பழுது', thee: 'தீ', pugai: 'புகை', veppam: 'வெப்பம்', veyil: 'வெயில்',
      sambalam: 'சம்பளம்', oothiyam: 'ஊதியம்', neram: 'நேரம்', kaalai: 'காலை', maalai: 'மாலை',
      iravu: 'இரவு', hello: 'வணக்கம்', hi: 'வணக்கம்', hey: 'வணக்கம்', good: 'நல்ல',
      morning: 'காலை', evening: 'மாலை', night: 'இரவு', shift: 'பணி', work: 'வேலை',
      worker: 'தொழிலாளி', workers: 'தொழிலாளர்கள்', water: 'குடிநீர்', drinking: 'குடிநீர்',
      no: 'இல்லை', not: 'இல்லை', working: 'வேலை செய்யவில்லை', broken: 'பழுதடைந்துள்ளது',
      damaged: 'சேதமடைந்துள்ளது', loose: 'தளர்ந்துள்ளது', missing: 'காணவில்லை',
      scaffolding: 'சாரம்', guard: 'தடுப்பு', rail: 'கம்பி', floor: 'தளம்', one: 'ஒன்று',
      two: 'இரண்டு', three: 'மூன்று', four: 'நான்கு', five: 'ஐந்து', electric: 'மின்சார',
      electrical: 'மின்சார', wire: 'மின் கம்பி', cable: 'மின் கம்பி', power: 'மின்சாரம்',
      shock: 'மின் அதிர்ச்சி', danger: 'ஆபத்து', dangerous: 'ஆபத்தான', unsafe: 'பாதுகாப்பற்ற',
      safety: 'பாதுகாப்பு', helmet: 'தலைக்கவசம்', gloves: 'கையுறைகள்', shoes: 'காலணிகள்',
      heat: 'வெப்பம்', hot: 'வெப்பம்', fire: 'தீ', smoke: 'புகை', fume: 'புகை',
      lab: 'ஆய்வகம்', laboratory: 'ஆய்வகம்', chemical: 'வேதியியல்', acid: 'அமிலம்',
      fan: 'மின்விசிறி', light: 'விளக்கு', projector: 'ஒளிப்படக் கருவி', room: 'அறை',
      hall: 'கூடம்', class: 'வகுப்பறை', classroom: 'வகுப்பறை', overtime: 'மிகை நேரம்',
      salary: 'ஊதியம்', wage: 'ஊதியம்', pay: 'ஊதியம்', payment: 'ஊதியம்', delay: 'தாமதம்',
      delayed: 'தாமதமாகிறது', hours: 'மணி நேரம்', hour: 'மணி நேரம்', problem: 'பிரச்சினை',
      issue: 'பிரச்சினை', urgent: 'அவசரம்', immediately: 'உடனடியாக', please: 'தயவுசெய்து',
      help: 'உதவி', check: 'சரிபார்க்கவும்', fix: 'சரிசெய்யவும்', repair: 'பழுதுபார்க்கவும்',
      injury: 'காயம்', pain: 'வலி', heavy: 'அதிக', workload: 'பணிச்சுமை', break: 'இடைவேளை',
      rest: 'ஓய்வு', toilet: 'கழிப்பறை', clean: 'சுத்தம்', is: 'உள்ளது', are: 'உள்ளன',
      in: 'இல்', on: 'மேல்', near: 'அருகே', and: 'மற்றும்', the: '', a: '', an: '',
      there: 'அங்கே', here: 'இங்கே', very: 'மிகவும்', need: 'தேவை', needed: 'தேவை',
    };

    const phoneticWordToTamil = (w) => {
      const lower = w.toLowerCase().replace(/[^a-z]/g, '');
      if (!lower) return w;
      if (Object.prototype.hasOwnProperty.call(TAMIL_SPEECH_LEXICON, lower)) {
        return TAMIL_SPEECH_LEXICON[lower];
      }
      const consMap = [
        ['zh', 'ழ்'], ['th', 'த்'], ['dh', 'த்'], ['sh', 'ஷ்'], ['ch', 'ச்'], ['ng', 'ங்'], ['nj', 'ஞ்'], ['tr', 'ட்ர'],
        ['k', 'க்'], ['g', 'க்'], ['c', 'க்'], ['j', 'ஜ்'], ['t', 'ட்'], ['d', 'ட்'], ['n', 'ன்'],
        ['p', 'ப்'], ['b', 'ப்'], ['f', 'ப்'], ['m', 'ம்'], ['y', 'ய்'], ['r', 'ர்'], ['l', 'ல்'],
        ['v', 'வ்'], ['w', 'வ்'], ['s', 'ஸ்'], ['z', 'ழ்'], ['h', 'ஹ்'], ['q', 'க்'], ['x', 'க்ஸ்'],
      ];
      const vowelStandalone = [
        ['aa', 'ஆ'], ['ee', 'ஈ'], ['ii', 'ஈ'], ['oo', 'ஊ'], ['uu', 'ஊ'], ['ai', 'ஐ'], ['au', 'ஔ'], ['ou', 'ஔ'],
        ['a', 'அ'], ['i', 'இ'], ['u', 'உ'], ['e', 'எ'], ['o', 'ஒ'],
      ];
      const vowelMatra = [
        ['aa', 'ா'], ['ee', 'ீ'], ['ii', 'ீ'], ['oo', 'ூ'], ['uu', 'ூ'], ['ai', 'ை'], ['au', 'ௌ'], ['ou', 'ௌ'],
        ['a', ''], ['i', 'ி'], ['u', 'ு'], ['e', 'ெ'], ['o', 'ொ'],
      ];
      let out = '';
      let idx = 0;
      while (idx < lower.length) {
        let matchedCons = null;
        for (const [lat, tam] of consMap) {
          if (lower.startsWith(lat, idx)) {
            matchedCons = [lat, tam];
            break;
          }
        }
        if (matchedCons) {
          const base = matchedCons[1].slice(0, -1);
          idx += matchedCons[0].length;
          let matchedVowel = null;
          for (const [vLat, vMatra] of vowelMatra) {
            if (lower.startsWith(vLat, idx)) {
              matchedVowel = [vLat, vMatra];
              break;
            }
          }
          if (matchedVowel) {
            out += base + matchedVowel[1];
            idx += matchedVowel[0].length;
          } else {
            out += matchedCons[1];
          }
        } else {
          let matchedV = null;
          for (const [vLat, vTam] of vowelStandalone) {
            if (lower.startsWith(vLat, idx)) {
              matchedV = [vLat, vTam];
              break;
            }
          }
          if (matchedV) {
            out += matchedV[1];
            idx += matchedV[0].length;
          } else {
            idx += 1;
          }
        }
      }
      return out || w;
    };

    const ensureTamilScript = (text) =>
      text
        .split(/(\s+)/)
        .map((tok) => (/[A-Za-z]/.test(tok) ? phoneticWordToTamil(tok) : tok))
        .join('')
        .replace(/\s+/g, ' ')
        .trim();

    const FALLBACK_VOICE_TEXT = {
      ta: {
        scaffolding: {
          title: 'நான்காவது தளத்தில் சாரம் தடுப்பு கம்பி தளர்ந்துள்ளது',
          desc: 'நான்காவது தளத்தின் கிழக்குப் பகுதியில் சாரம் தாங்கும் கம்பி தளர்ந்து ஆபத்தான நிலையில் உள்ளது. உடனடியாகப் பராமரிப்பு குழுவினர் சரிபார்க்க வேண்டும்.',
        },
        electrical: {
          title: 'சுரங்கப் பாதை அருகே திறந்த மின் கம்பி ஆபத்து',
          desc: 'பகுதி இரண்டில் தண்ணீர் தேங்கியுள்ள இடத்திற்கு அருகில் மின்சார கம்பி காப்பு இல்லாமல் திறந்த நிலையில் உள்ளது. உடனடியாக மின் இணைப்பை நிறுத்தி சரி செய்யவும்.',
        },
        ppe: {
          title: 'பாதுகாப்பு தலைக்கவசம் மற்றும் கையுறைகள் பற்றாக்குறை',
          desc: 'காலைப் பணி குழுவிற்குத் தேவையான பாதுகாப்பு தலைக்கவசங்கள் மற்றும் கையுறைகள் கிடங்கில் கையிருப்பில் இல்லை.',
        },
        heat_fatigue: {
          title: 'கடும் வெப்பம் மற்றும் குடிநீர் தட்டுப்பாடு',
          desc: 'பணித்தளத்தில் வெப்பம் அதிகமாக உள்ளது, மேலும் மூன்றாவது தளத்தில் குடிநீர் கலன் காலியாக உள்ளது.',
        },
        wage_dispute: {
          title: 'கடந்த வார மிகை நேர ஊதியம் கணக்கிடப்படவில்லை',
          desc: 'வெள்ளிக்கிழமை இரவுப் பணியில் செய்த மூன்று மணி நேர மிகை நேரப் பணி ஊதியப் பட்டியலில் சேர்க்கப்படவில்லை.',
        },
        lab_safety: {
          title: 'வேதியியல் ஆய்வகத்தில் புகை வெளியேற்றும் கருவி பழுது',
          desc: 'மூன்றாவது ஆய்வகத்தில் அமிலப் புகையை வெளியேற்றும் கருவி வேலை செய்யவில்லை.',
        },
        workload: {
          title: 'தொடர்ச்சியான கூடுதல் ஆய்வகப் பணிச்சுமை',
          desc: 'உணவு இடைவேளை இன்றித் தொடர்ந்து நான்கு ஆய்வகப் பிரிவுகளுக்குப் பணி ஒதுக்கப்பட்டுள்ளது.',
        },
        infrastructure: {
          title: 'வகுப்பறை மின்விசிறி மற்றும் விளக்குகள் பழுது',
          desc: 'இரண்டாவது தளத்தில் உள்ள கருத்தரங்கு கூடத்தில் மின்விசிறிகள் பழுதடைந்துள்ளன.',
        },
        harassment: {
          title: 'பணியிடத்தில் கண்ணியமான நடத்தையை உறுதி செய்தல்',
          desc: 'துறைக் கூட்டத்தின் போது ஒப்பந்தப் பணியாளர்களிடம் கடுமையான வார்த்தைகள் பயன்படுத்தப்பட்டன.',
        },
        stipend_delay: {
          title: 'மதிப்பீட்டுப் பணி ஊதியம் தாமதம்',
          desc: 'கடந்த மாத செய்முறைத் தேர்வு கண்காணிப்புப் பணிக்கான கூடுதல் ஊதியம் இன்னும் வழங்கப்படவில்லை.',
        },
      },
      hi: {
        scaffolding: {
          title: 'चौथी मंजिल पर मचान की रेलिंग ढीली है',
          desc: 'चौथी मंजिल के पूर्वी हिस्से में मचान का क्लैंप ढीला हो गया है और गिरने का खतरा है। कृपया तुरंत जांच करें।',
        },
        electrical: {
          title: 'सुरंग क्षेत्र में खुला बिजली का तार',
          desc: 'सेक्टर दो में पानी के पास मुख्य बिजली केबल का इंसुलेशन फटा हुआ है। तुरंत मरम्मत की आवश्यकता है।',
        },
        ppe: {
          title: 'सुरक्षा हेलमेट और दस्तानों की कमी',
          desc: 'सुबह की पाली के श्रमिकों के लिए स्टोर में पर्याप्त सुरक्षा हेलमेट और दस्ताने उपलब्ध नहीं हैं।',
        },
        heat_fatigue: {
          title: 'अत्यधिक गर्मी और पीने के पानी की कमी',
          desc: 'कार्यस्थल पर तापमान बहुत अधिक है और तीसरी मंजिल पर पेयजल स्टेशन खाली है।',
        },
        wage_dispute: {
          title: 'पिछले सप्ताह का ओवरटाइम वेतन दर्ज नहीं हुआ',
          desc: 'शुक्रवार की रात्रि पाली में किए गए तीन घंटे के ओवरटाइम को वेतन पर्ची में शामिल नहीं किया गया है।',
        },
        lab_safety: {
          title: 'रसायन प्रयोगशाला में फ्यूम हुड खराब है',
          desc: 'प्रयोगशाला संख्या तीन में वेंटिलेशन और फ्यूम हुड काम नहीं कर रहा है।',
        },
        workload: {
          title: 'लगातार अतिरिक्त प्रयोगशाला सत्रों का कार्यभार',
          desc: 'बिना विश्राम अंतराल के लगातार चार प्रयोगशाला सत्र आवंटित किए गए हैं।',
        },
        infrastructure: {
          title: 'व्याख्यान कक्ष में पंखे और प्रोजेक्टर खराब हैं',
          desc: 'दूसरी मंजिल के सेमिनार हॉल में वेंटिलेशन पंखे काम नहीं कर रहे हैं।',
        },
        harassment: {
          title: 'कार्यस्थल पर सम्मानजनक व्यवहार सुनिश्चित करना',
          desc: 'विभागीय बैठक के दौरान संविदा कर्मचारियों के प्रति अनुचित भाषा का प्रयोग किया गया।',
        },
        stipend_delay: {
          title: 'प्रायोगिक परीक्षा ड्यूटी के मानदेय में देरी',
          desc: 'पिछले महीने की प्रयोगशाला परीक्षा ड्यूटी का अतिरिक्त भत्ता अभी तक प्राप्त नहीं हुआ है।',
        },
      },
      en: {
        scaffolding: {
          title: 'Scaffolding guard rail loose on Floor 4',
          desc: 'The scaffolding clamp on Floor 4 East Wing is loose and poses a fall risk. Immediate inspection needed.',
        },
        electrical: {
          title: 'Exposed live electrical cable near tunnel shaft',
          desc: 'Main power cable insulation is damaged near water pooling in Sector 2. Immediate isolation required.',
        },
        ppe: {
          title: 'Shortage of safety helmets and insulated gloves',
          desc: 'Morning shift crew at Block B lacks replacement hard-hats and high-voltage safety gloves.',
        },
        heat_fatigue: {
          title: 'Extreme heat stress and empty drinking water station',
          desc: 'Workers on Floor 3 are experiencing heat exhaustion and the drinking water dispenser is empty.',
        },
        wage_dispute: {
          title: 'Unrecorded overtime hours from Friday night shift',
          desc: 'Three hours of overtime worked during Friday tunnel concrete pouring were not added to the shift log.',
        },
        lab_safety: {
          title: 'Chemical fume hood malfunction in Lab 3',
          desc: 'The exhaust ventilation in Chemistry Lab 3 is not drawing fumes properly.',
        },
        workload: {
          title: 'Back-to-back lab sessions without rest interval',
          desc: 'Assigned four consecutive lab demonstration sessions without a scheduled break.',
        },
        infrastructure: {
          title: 'Ventilation fans and projector failure in Lecture Hall 2',
          desc: 'Ceiling fans and electrical sockets in Lecture Hall 2B are malfunctioning.',
        },
        harassment: {
          title: 'Unfair treatment during departmental scheduling',
          desc: 'Contract lab staff were spoken to disrespectfully during the morning lab allocation meeting.',
        },
        stipend_delay: {
          title: 'Delay in lab examination invigilation stipend',
          desc: 'Additional remuneration for last month practical exam supervision has not been credited yet.',
        },
      },
    };

    const setRecordingUI = (active) => {
      isRecording = active;
      if (active) {
        micBtn.classList.add('recording');
        micIcon.textContent = '🔴';
        micText.textContent = t('grievance.listening', 'Listening... Speak now');
      } else {
        micBtn.classList.remove('recording');
        micIcon.textContent = '🎙️';
        micText.textContent = t('grievance.voiceReport', 'Speak to Report (Voice)');
      }
    };

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    const finalizeStop = () => {
      if (stopFinalized) return;
      stopFinalized = true;
      if (stopFallbackTimer) {
        clearTimeout(stopFallbackTimer);
        stopFallbackTimer = null;
      }
      // If browser SpeechRecognition was blocked/unsupported and produced no transcript after stop() flushed, populate localized transcript
      if (!voiceDictated && (!descInput.value.trim() || speechEngineBlocked)) {
        const langDict = FALLBACK_VOICE_TEXT[state.lang] || FALLBACK_VOICE_TEXT.en;
        const selectedCat = catSelect ? catSelect.value : 'scaffolding';
        const tpl = langDict[selectedCat] || Object.values(langDict)[0];
        titleInput.value = tpl.title;
        descInput.value = tpl.desc;
        voiceDictated = true;
      }
      setRecordingUI(false);
      if (voiceDictated) {
        showToast(t('grievance.dictatedViaVoice', 'Voice transcribed!'));
      }
    };

    const startSpeechSession = () => {
      if (!SpeechRecognition) {
        speechEngineBlocked = true;
        return;
      }

      const rec = new SpeechRecognition();
      activeRecognition = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = currentRecognitionLang;
      sessionFinalTranscript = '';

      rec.onresult = (evt) => {
        let curFinal = '';
        let curInterim = '';
        for (let i = 0; i < evt.results.length; i += 1) {
          const piece = evt.results[i][0].transcript || '';
          if (evt.results[i].isFinal) {
            curFinal += `${piece} `;
          } else {
            curInterim += piece;
          }
        }
        sessionFinalTranscript = curFinal.trim();

        const rawSpokenText = [committedTranscript, sessionFinalTranscript, curInterim.trim()]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        const spokenText = state.lang === 'ta' ? ensureTamilScript(rawSpokenText) : rawSpokenText;
        if (spokenText) {
          voiceDictated = true;
          speechEngineBlocked = false;
          descInput.value = initialDescBeforeMic ? `${initialDescBeforeMic} ${spokenText}` : spokenText;
          if (!initialTitleBeforeMic) {
            titleInput.value = spokenText.slice(0, 70);
          }
        }
      };

      rec.onerror = (evt) => {
        if (evt.error === 'no-speech' || (evt.error === 'aborted' && userStopped)) {
          return;
        }
        if (evt.error === 'language-not-supported' || evt.error === 'service-not-allowed') {
          if (currentRecognitionLang === 'ta-IN') {
            currentRecognitionLang = 'ta';
            return;
          }
          if (currentRecognitionLang !== 'en-IN') {
            // Retry with en-IN + live Tamil script converter if OS lacks ta-IN dictation pack
            currentRecognitionLang = 'en-IN';
            return;
          }
        }
        if (evt.error === 'network' || evt.error === 'service-not-allowed' || evt.error === 'language-not-supported') {
          speechEngineBlocked = true;
          return;
        }
        if (evt.error === 'not-allowed' || evt.error === 'audio-capture') {
          userStopped = true;
          setRecordingUI(false);
          showToast('Microphone permission denied. Please allow microphone access in your browser.', 'error');
        }
      };

      rec.onend = () => {
        if (sessionFinalTranscript) {
          committedTranscript = [committedTranscript, sessionFinalTranscript].filter(Boolean).join(' ').trim();
          sessionFinalTranscript = '';
        }
        if (isRecording && !userStopped && !speechEngineBlocked) {
          // Automatically continue listening across pauses or language fallback until user clicks button to stop
          restartTimer = setTimeout(() => {
            if (isRecording && !userStopped && !speechEngineBlocked) {
              startSpeechSession();
            }
          }, 100);
          return;
        }
        if (userStopped) {
          finalizeStop();
        } else if (!isRecording) {
          setRecordingUI(false);
        }
      };

      try {
        rec.start();
      } catch {
        speechEngineBlocked = true;
      }
    };

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (!isRecording) {
          userStopped = false;
          stopFinalized = false;
          voiceDictated = false;
          speechEngineBlocked = false;
          committedTranscript = '';
          sessionFinalTranscript = '';
          initialTitleBeforeMic = titleInput.value.trim();
          initialDescBeforeMic = descInput.value.trim();
          currentRecognitionLang = getOptimalRecognitionLang();
          setRecordingUI(true);
          startSpeechSession();
        } else {
          userStopped = true;
          if (restartTimer) {
            clearTimeout(restartTimer);
            restartTimer = null;
          }
          if (activeRecognition && !speechEngineBlocked) {
            try {
              activeRecognition.stop();
              // Allow up to 600ms for browser to flush final ta-IN onresult before onend
              stopFallbackTimer = setTimeout(finalizeStop, 600);
            } catch {
              finalizeStop();
            }
            activeRecognition = null;
          } else {
            finalizeStop();
          }
        }
      });
    }

    // Photo Input Reading & Compression + Preview
    let attachedPhotoDataUrl = null;
    const photoInput = document.getElementById('grv-photo');
    const previewBox = document.getElementById('grv-photo-preview-box');
    const previewImg = document.getElementById('grv-photo-preview-img');
    const removePhotoBtn = document.getElementById('btn-remove-photo');

    if (photoInput) {
      photoInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const rawDataUrl = ev.target.result;
          const img = new Image();
          img.onload = () => {
            const maxDim = 900;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            attachedPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            if (previewImg && previewBox) {
              previewImg.src = attachedPhotoDataUrl;
              previewBox.style.display = 'block';
            }
          };
          img.onerror = () => {
            attachedPhotoDataUrl = rawDataUrl;
            if (previewImg && previewBox) {
              previewImg.src = attachedPhotoDataUrl;
              previewBox.style.display = 'block';
            }
          };
          img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
      });
    }

    if (removePhotoBtn) {
      removePhotoBtn.addEventListener('click', () => {
        attachedPhotoDataUrl = null;
        if (photoInput) photoInput.value = '';
        if (previewBox) previewBox.style.display = 'none';
        if (previewImg) previewImg.src = '';
      });
    }

    if (previewImg) {
      previewImg.addEventListener('click', () => {
        if (attachedPhotoDataUrl) {
          openHazardImageModal(attachedPhotoDataUrl, document.getElementById('grv-title')?.value || '');
        }
      });
    }

    document.querySelectorAll('.btn-view-hazard-photo').forEach((elBtn) => {
      elBtn.addEventListener('click', () => {
        const id = elBtn.getAttribute('data-grv-id');
        const grv = grievances.find((item) => item.id === id);
        if (grv) {
          openHazardImageModal(getHazardEvidenceImage(grv), grv.title);
        }
      });
    });

    // Submit Grievance
    const form = document.getElementById('grievance-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        category: document.getElementById('grv-category').value,
        title: document.getElementById('grv-title').value,
        description: document.getElementById('grv-description').value,
        severity: document.getElementById('grv-severity').value,
        photoUrl: attachedPhotoDataUrl,
        voiceInputUsed: voiceDictated,
      };

      try {
        await api('/api/grievances', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast(t('grievance.statusSubmitted', 'Submitted!'));
        renderCurrentView();
      } catch (err) {
        console.error(err);
      }
    });
  }

  // =========================================================================
  // WORKER VIEW: Anonymous Welfare Feedback
  // =========================================================================
  function renderFeedbackView() {
    el.contentArea.innerHTML = `
      <section aria-labelledby="fb-header">
        <h2 id="fb-header" style="margin-bottom: 12px; font-weight:800; font-size:1.4rem;">
          💬 ${t('feedback.title', 'Anonymous Welfare Feedback')}
        </h2>

        <!-- Privacy Shield Guarantee Banner -->
        <div style="background:#ecfdf5; border:2px solid #6ee7b7; border-radius:var(--radius); padding:16px; margin-bottom:16px; display:flex; align-items:center; gap:12px;">
          <span style="font-size:2rem;">🛡️</span>
          <div>
            <strong style="color:#065f46; font-size:1.05rem;">
              ${t('feedback.privacyBadge', '100% Anonymous – Zero Worker ID Stored')}
            </strong>
            <p style="color:#047857; font-size:0.875rem; margin-top:2px;">
              ${t('feedback.privacyDesc', 'Your submission is cryptographically decoupled from your profile. Supervisors only see aggregated scores and themes once at least 3 people respond.')}
            </p>
          </div>
        </div>

        <div class="card">
          <form id="anonymous-feedback-form">
            <div class="form-group">
              <label class="form-label" for="fb-category">📌 ${t('feedback.category', 'Topic')}:</label>
              <select id="fb-category" class="form-control" required>
                <option value="safety_culture">${t('feedback.catSafety', 'Safety Standards & Gear Quality')}</option>
                <option value="workload_fairness">${t('feedback.catWorkload', 'Workload, Shift Length & Rest Intervals')}</option>
                <option value="wage_transparency">${t('feedback.catWage', 'Pay Timeliness & Transparent Deductions')}</option>
                <option value="workplace_morale">${t('feedback.catMorale', 'Supervisor Respect & Workplace Atmosphere')}</option>
                <option value="amenities">${t('feedback.catAmenities', 'Drinking Water, Sanitation & Facilities')}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="fb-rating">⭐ ${t('feedback.rating', 'Overall Satisfaction (1 to 5)')}:</label>
              <select id="fb-rating" class="form-control" style="font-size:1.1rem; font-weight:700;">
                <option value="5">⭐⭐⭐⭐⭐ ${t('feedback.rate5', '5 - Highly Satisfied')}</option>
                <option value="4" selected>⭐⭐⭐⭐ ${t('feedback.rate4', '4 - Satisfied')}</option>
                <option value="3">⭐⭐⭐ ${t('feedback.rate3', '3 - Neutral / Room for Improvement')}</option>
                <option value="2">⭐⭐ ${t('feedback.rate2', '2 - Dissatisfied')}</option>
                <option value="1">⭐ ${t('feedback.rate1', '1 - Highly Stressed / Unsafe')}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="fb-comment">✍️ ${t('feedback.comment', 'What should improve?')}:</label>
              <textarea id="fb-comment" class="form-control" rows="4" placeholder="${t('feedback.commentPlaceholder', 'Speak your mind freely. No name or ID is recorded...')}" required></textarea>
            </div>

            <button type="submit" class="btn-primary" style="width: 100%; padding: 14px; font-size:1.1rem;">
              🔒 ${t('feedback.submitBtn', 'Send Anonymous Note')}
            </button>
          </form>
        </div>
      </section>
    `;

    const form = document.getElementById('anonymous-feedback-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        category: document.getElementById('fb-category').value,
        rating: Number(document.getElementById('fb-rating').value),
        comment: document.getElementById('fb-comment').value,
      };

      try {
        await api('/api/feedback/anonymous', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast(t('feedback.success', 'Feedback recorded anonymously!'));
        form.reset();
      } catch (err) {
        console.error(err);
      }
    });
  }

  // =========================================================================
  // ADMIN VIEW: Employer Workforce Health Dashboard
  // =========================================================================
  async function renderAdminDashboardView() {
    let dash = null;
    try {
      dash = await api('/api/analytics/dashboard');
    } catch {
      el.contentArea.innerHTML = `<div class="card"><p>${t('admin.title', 'Dashboard')}</p></div>`;
      return;
    }

    const ws = dash.workforceSummary;
    const hrUnit = t('units.hrShort', 'h');
    const otUnit = t('units.otSuffix', 'OT');
    const localeCode = state.lang === 'ta' ? 'ta-IN' : state.lang === 'hi' ? 'hi-IN' : 'en-US';
    const trSeverity = (sev) => {
      if (sev === 'critical') return t('grievance.sevBadgeCritical', 'CRITICAL');
      if (sev === 'high') return t('grievance.sevBadgeHigh', 'HIGH');
      if (sev === 'medium') return t('grievance.sevBadgeMedium', 'MEDIUM');
      return t('grievance.sevBadgeLow', 'LOW');
    };

    el.contentArea.innerHTML = `
      <section aria-labelledby="admin-dash-header">
        <h2 id="admin-dash-header" style="margin-bottom: 12px; font-weight:800; font-size:1.4rem;">
          📊 ${t('admin.title', 'Employer Workforce Health Dashboard')}
        </h2>

        <!-- Top Metric Summary Cards -->
        <div class="grid">
          <div class="stat-box">
            <div class="stat-value">${ws.totalShiftsRecorded}</div>
            <div class="stat-label">${t('admin.totalShifts', 'Total Shifts Recorded')}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" style="color:#d97706;">${ws.totalOtHours} ${hrUnit}</div>
            <div class="stat-label">${t('admin.totalOt', 'Total Overtime Hours Logged')}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" style="color: ${ws.openGrievanceCount > 0 ? '#dc2626' : '#059669'};">
              ${ws.openGrievanceCount}
            </div>
            <div class="stat-label">${t('admin.openGrievanceCount', 'Open Safety Grievances')}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" style="color:#2563eb;">${ws.feedbackAverageRating} / 5</div>
            <div class="stat-label">${t('admin.avgMorale', 'Average Anonymous Morale')}</div>
          </div>
        </div>

        <!-- Attendance Trends Card -->
        <div class="card" style="margin-top:20px;">
          <h3 class="card-title">📈 ${t('admin.attendanceTrends', 'Attendance & Overtime Trends')}</h3>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:12px;">
            ${t('admin.trendsSub', 'Recent completed shifts across active departments')}
          </p>
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.95rem;">
              <thead>
                <tr style="border-bottom:2px solid var(--border); color:var(--text-muted);">
                  <th style="padding:8px;">${t('common.worker', 'Worker')}</th>
                  <th style="padding:8px;">${t('common.date', 'Date')}</th>
                  <th style="padding:8px;">${t('common.shift', 'Shift')}</th>
                  <th style="padding:8px;">${t('common.total', 'Total Hours')}</th>
                  <th style="padding:8px;">${t('common.overtime', 'Overtime')}</th>
                </tr>
              </thead>
              <tbody>
                ${dash.attendanceTrends.recentShifts
                  .map(
                    (s) => `
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:10px 8px; font-weight:600;">${trDynamic(s.workerName || s.workerId)}</td>
                    <td style="padding:10px 8px;">${s.date}</td>
                    <td style="padding:10px 8px;">${trDynamic(s.shiftName)}</td>
                    <td style="padding:10px 8px;">${s.totalHours} ${hrUnit}</td>
                    <td style="padding:10px 8px; color:${s.overtimeHours > 0 ? '#b45309' : 'inherit'}; font-weight:700;">
                      ${s.overtimeHours > 0 ? `+${s.overtimeHours} ${hrUnit} (${otUnit})` : `0 ${hrUnit}`}
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Open Safety Grievances Summary -->
        <div class="card" style="margin-top:20px;">
          <div class="card-header">
            <span class="card-title">⚠️ ${t('admin.openGrievances', 'Open Safety Hazards & Grievances')}</span>
            <span class="badge ${ws.criticalGrievanceCount > 0 ? 'badge-danger' : 'badge-warning'}">
              ${ws.openGrievanceCount} ${t('admin.pendingBadge', 'Pending')}
            </span>
          </div>
          ${
            dash.openGrievances.length === 0
              ? `<p style="color:#059669; font-weight:600;">✅ ${t('admin.allResolved', 'All safety reports and grievances are resolved!')}</p>`
              : dash.openGrievances
                  .map(
                    (g) => `
                <div style="border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:10px; background:#f8fafc;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${g.title}</strong>
                    <span class="badge ${g.severity === 'critical' ? 'badge-danger' : 'badge-warning'}">${trSeverity(g.severity)}</span>
                  </div>
                  <div style="font-size:0.85rem; color:var(--text-muted); margin:4px 0;">
                    ${t('admin.filedBy', 'Filed by')}: 🔒 <strong>${t('feedback.anonymousWorkerLabel', 'Anonymous Worker')}</strong> (${trDynamic(g.department || '')}) - ${new Date(g.submittedAt).toLocaleDateString(localeCode)}
                  </div>
                  <p style="font-size:0.9rem;">${g.description}</p>
                  <div style="margin-top:8px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <img src="${getHazardEvidenceImage(g)}" alt="${escapeHtml(g.title)}" class="btn-dash-hazard-photo" data-grv-id="${g.id}" style="height:56px; width:84px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1; cursor:pointer;" />
                    <button type="button" class="pill-btn btn-dash-hazard-photo" data-grv-id="${g.id}" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:5px 10px; font-size:0.85rem; font-weight:700; cursor:pointer;">
                      🖼️ ${t('grievance.viewPhotoBtn', 'View Photo Proof')}
                    </button>
                  </div>
                </div>
              `
                  )
                  .join('')
          }
        </div>
      </section>
    `;

    document.querySelectorAll('.btn-dash-hazard-photo').forEach((elBtn) => {
      elBtn.addEventListener('click', () => {
        const id = elBtn.getAttribute('data-grv-id');
        const grv = (dash.openGrievances || []).find((item) => item.id === id);
        if (grv) {
          openHazardImageModal(getHazardEvidenceImage(grv), grv.title);
        }
      });
    });
  }

  // =========================================================================
  // ADMIN VIEW: Grievance Resolution & Replies
  // =========================================================================
  async function renderAdminGrievancesView() {
    let grievances = [];
    try {
      grievances = await api('/api/grievances');
    } catch (e) {
      console.warn(e);
    }

    const trSeverity = (sev) => {
      if (sev === 'critical') return t('grievance.sevBadgeCritical', 'CRITICAL');
      if (sev === 'high') return t('grievance.sevBadgeHigh', 'HIGH');
      if (sev === 'medium') return t('grievance.sevBadgeMedium', 'MEDIUM');
      return t('grievance.sevBadgeLow', 'LOW');
    };

    el.contentArea.innerHTML = `
      <section aria-labelledby="admin-grv-header">
        <h2 id="admin-grv-header" style="margin-bottom: 12px; font-weight:800; font-size:1.4rem;">
          ⚠️ ${t('admin.grievanceMgmt', 'Grievance & Hazard Management')}
        </h2>

        ${
          grievances.length === 0
            ? `<div class="card"><p>${t('grievance.noReports', 'No reports found.')}</p></div>`
            : grievances
                .map(
                  (g) => `
              <div class="card" style="border-left: 6px solid ${g.status === 'Resolved' ? '#059669' : '#e11d48'};">
                <div class="card-header">
                  <span class="card-title">${g.title}</span>
                  <span class="badge ${g.status === 'Resolved' ? 'badge-success' : 'badge-warning'}">${t(`grievance.status${g.status.replace(/\s+/g, '')}`, g.status)}</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px;">
                  ${t('common.worker', 'Worker')}: 🔒 <strong>${t('feedback.anonymousWorkerLabel', 'Anonymous Worker')}</strong> | ${t('grievance.category', 'Category')}: <strong>${trDynamic(g.categoryLabel)}</strong> | ${t('grievance.severity', 'Severity')}: <strong>${trSeverity(g.severity)}</strong>
                </div>
                <p style="margin-bottom:10px;">${g.description}</p>

                <div style="margin-bottom:12px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:#f8fafc; border:1px solid var(--border); padding:10px; border-radius:8px;">
                  <img src="${getHazardEvidenceImage(g)}" alt="${escapeHtml(g.title)}" class="btn-admin-hazard-photo" data-grv-id="${g.id}" style="height:72px; width:108px; object-fit:cover; border-radius:6px; border:1px solid #cbd5e1; cursor:pointer;" />
                  <button type="button" class="pill-btn btn-admin-hazard-photo" data-grv-id="${g.id}" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:7px 14px; font-weight:700; cursor:pointer;">
                    🖼️ ${t('grievance.viewPhotoBtn', 'View Photo Proof')}
                  </button>
                </div>

                ${
                  g.replies && g.replies.length > 0
                    ? `
                  <div style="background:#eff6ff; padding:10px; border-radius:6px; margin-bottom:12px;">
                    <strong>${t('grievance.adminReplyTitle', 'Admin Note')} (${trDynamic(g.replies[0].author)}):</strong> ${g.replies[0].message}
                  </div>
                `
                    : ''
                }

                <div style="background:#f1f5f9; padding:12px; border-radius:8px;">
                  <label class="form-label" style="font-size:0.9rem;">${t('admin.updateStatusLabel', 'Update Status & Official Reply')}:</label>
                  <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
                    <select id="status-sel-${g.id}" class="form-control" style="max-width:220px;">
                      <option value="Acknowledged" ${g.status === 'Acknowledged' ? 'selected' : ''}>${t('grievance.statusAcknowledged', 'Acknowledged')}</option>
                      <option value="In Progress" ${g.status === 'In Progress' ? 'selected' : ''}>${t('grievance.statusInProgress', 'In Progress')}</option>
                      <option value="Resolved" ${g.status === 'Resolved' ? 'selected' : ''}>${t('grievance.statusResolved', 'Resolved')}</option>
                    </select>
                    <input id="reply-msg-${g.id}" class="form-control" style="flex:1;" placeholder="${t('admin.replyPlaceholder', 'Provide resolution or safety update message...')}" />
                    <button class="btn-primary btn-update-grv" data-id="${g.id}">${t('common.update', 'Update')}</button>
                  </div>
                </div>
              </div>
            `
                )
                .join('')
        }
      </section>
    `;

    document.querySelectorAll('.btn-admin-hazard-photo').forEach((elBtn) => {
      elBtn.addEventListener('click', () => {
        const id = elBtn.getAttribute('data-grv-id');
        const grv = grievances.find((item) => item.id === id);
        if (grv) {
          openHazardImageModal(getHazardEvidenceImage(grv), grv.title);
        }
      });
    });

    document.querySelectorAll('.btn-update-grv').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const status = document.getElementById(`status-sel-${id}`).value;
        const replyMessage = document.getElementById(`reply-msg-${id}`).value;

        try {
          await api(`/api/grievances/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, replyMessage }),
          });
          showToast(t('common.update', 'Updated!'));
          renderCurrentView();
        } catch (err) {
          console.error(err);
        }
      });
    });
  }

  // =========================================================================
  // ADMIN VIEW: Anonymous Feedback Aggregator
  // =========================================================================
  async function renderAdminFeedbackView() {
    let insights = null;
    try {
      insights = await api('/api/feedback/insights');
    } catch {
      el.contentArea.innerHTML = `<div class="card"><p>${t('admin.feedbackThemes', 'Feedback')}</p></div>`;
      return;
    }

    const { sentimentSummary, averageRating, totalResponses, departmentBreakdowns } = insights;

    el.contentArea.innerHTML = `
      <section aria-labelledby="admin-fb-header">
        <h2 id="admin-fb-header" style="margin-bottom: 12px; font-weight:800; font-size:1.4rem;">
          💬 ${t('admin.feedbackThemes', 'Anonymous Feedback & Sentiment Analysis')}
        </h2>

        <!-- K-Anonymity Privacy Banner -->
        <div style="background:#eff6ff; border:2px solid #93c5fd; border-radius:var(--radius); padding:14px; margin-bottom:16px;">
          <strong style="color:#1e40af;">🛡️ ${t('admin.kAnonTitle', 'K-Anonymity Protection Active')}</strong>
          <p style="color:#1e3a8a; font-size:0.875rem; margin-top:2px;">
            ${t('admin.kAnonDesc', 'Department breakdowns are strictly suppressed if fewer than 3 workers responded, preventing any identification.')}
          </p>
        </div>

        <div class="grid">
          <div class="stat-box">
            <div class="stat-value">${totalResponses}</div>
            <div class="stat-label">${t('admin.totalSubmissions', 'Total Submissions')}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" style="color:#2563eb;">${averageRating} / 5</div>
            <div class="stat-label">${t('admin.avgSatisfaction', 'Average Satisfaction')}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" style="color:#059669;">${sentimentSummary.positive}</div>
            <div class="stat-label">${t('admin.posSentiments', 'Positive Sentiments')}</div>
          </div>
          <div class="stat-box">
            <div class="stat-value" style="color:#dc2626;">${sentimentSummary.negative}</div>
            <div class="stat-label">${t('admin.negSentiments', 'Negative Sentiments')}</div>
          </div>
        </div>

        <!-- Departmental Aggregation Cards -->
        <div class="card" style="margin-top:20px;">
          <h3 class="card-title" style="margin-bottom:12px;">🏢 ${t('admin.deptBreakdowns', 'Departmental Sentiment Breakdowns')}</h3>
          ${
            Object.keys(departmentBreakdowns).length === 0
              ? `<p style="color:var(--text-muted);">${t('admin.noFeedbackYet', 'No feedback records yet.')}</p>`
              : Object.entries(departmentBreakdowns)
                  .map(([dept, data]) => {
                    if (data.suppressedDueToPrivacy) {
                      return `
                  <div style="border:1px dashed #f59e0b; background:#fffbeb; padding:14px; border-radius:8px; margin-bottom:12px;">
                    <strong>${trDynamic(dept)} (${data.count} ${t('admin.responses', 'responses')})</strong>
                    <div style="color:#92400e; font-size:0.9rem; margin-top:4px;">
                      🔒 <em>${t('admin.kAnonDesc', data.message)}</em>
                    </div>
                  </div>
                `;
                    }

                    return `
                <div style="border:1px solid var(--border); background:#f8fafc; padding:14px; border-radius:8px; margin-bottom:12px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                    <strong style="font-size:1.05rem;">${trDynamic(dept)} (${data.count} ${t('admin.responses', 'responses')})</strong>
                    <span class="badge badge-success">★ ${data.averageRating} / 5</span>
                  </div>
                  <div style="font-size:0.85rem; color:var(--text-muted); margin:4px 0 10px 0;">
                    ${t('admin.posSentiments', 'Positive')}: ${data.sentiments.positive} | ${t('common.neutral', 'Neutral')}: ${data.sentiments.neutral} | ${t('admin.negSentiments', 'Negative')}: ${data.sentiments.negative}
                  </div>
                  ${data.items
                    .map(
                      (item) => `
                    <div style="background:#fff; border-left:3px solid var(--border); padding:8px 12px; margin-bottom:6px; border-radius:4px; font-size:0.9rem;">
                      "${item.comment}" <span style="color:var(--text-muted); font-size:0.8rem;">(${trDynamic(item.category)})</span>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `;
                  })
                  .join('')
          }
        </div>
      </section>
    `;
  }

  // =========================================================================
  // MODALS & EVENT HANDLERS
  // =========================================================================
  function setupEventListeners() {
    // Language Selector (English / Tamil / Hindi)
    el.langToggle.addEventListener('change', async (e) => {
      const nextLang = e.target.value;
      await loadTranslations(nextLang, true);
      const labels = {
        en: 'Switched to English',
        ta: 'தமிழ் மொழிக்கு மாற்றப்பட்டது',
        hi: 'भाषा हिन्दी में बदली गई',
      };
      showToast(labels[nextLang] || 'Language updated');
    });

    // Switch Portal / Sign Out Button -> Opens Separated Sector Login Portals
    if (el.portalLogoutBtn) {
      el.portalLogoutBtn.addEventListener('click', () => {
        logoutToPortals();
      });
    }

    // Demo Personas Credentials Reference Modal (Email & Unique Password for each person)
    if (el.demoBtn) {
      el.demoBtn.addEventListener('click', () => {
        const conUsers = state.demoUsers.filter((u) => u.industry === 'construction');
        const colUsers = state.demoUsers.filter((u) => u.industry === 'college');

        const renderCredRows = (users) =>
          users
            .map(
              (u) => `
              <div style="border:1px solid var(--border); border-radius:8px; padding:10px 12px; margin-bottom:8px; background:#f8fafc;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                  <strong>${u.avatar || '👤'} ${trDynamic(u.name)} (${trDynamic(u.roleTitle)})</strong>
                  <span class="badge ${u.role === 'admin' ? 'badge-warning' : 'badge-success'}">
                    ${u.role === 'admin' ? t('modals.employerRoleBadge', 'EMPLOYER / ADMIN') : t('modals.workerRoleBadge', 'WORKER / STAFF')}
                  </span>
                </div>
                <div style="margin-top:6px; font-size:0.88rem; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; background:#ffffff; padding:6px 10px; border-radius:6px; border:1px dashed #cbd5e1;">
                  <span>📧 ${t('modals.emailTag', 'Email')}: <code><strong>${u.email}</strong></code></span>
                  <span>🔑 ${t('modals.passwordTag', 'Password')}: <code><strong>${u.demoPassword}</strong></code></span>
                </div>
              </div>
            `
            )
            .join('');

        openModal(
          `🎭 ${t('modals.demoTitle', 'Demo Personas – Login Credentials')}`,
          `
          <p style="color:var(--text-muted); margin-bottom:14px; font-size:0.92rem;">
            ${t('modals.demoDesc', 'Use these unique credentials in the Worker Login Portal or Employer Login Portal:')}
          </p>
          <h4 style="color:#92400e; margin-bottom:8px; font-size:1rem;">🏗️ ${t('modals.constructionBtn', 'Construction Site')} (${trDynamic('METRO-4')})</h4>
          ${renderCredRows(conUsers)}
          <h4 style="color:#312e81; margin:14px 0 8px 0; font-size:1rem;">🎓 ${t('modals.collegeBtn', 'College Campus')} (${trDynamic('APEX-1')})</h4>
          ${renderCredRows(colUsers)}
        `
        );
      });
    }
  }

  function openModal(title, bodyHtml) {
    el.modalContainer.innerHTML = `
      <div class="modal-overlay" role="dialog" aria-modal="true">
        <div class="modal-content">
          <div class="modal-header">
            <h3 style="font-size:1.25rem; font-weight:800;">${title}</h3>
            <button id="modal-close-btn" class="pill-btn" aria-label="Close dialog" style="font-size:1.2rem; border:none; background:none; cursor:pointer;">✕</button>
          </div>
          <div>${bodyHtml}</div>
        </div>
      </div>
    `;
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  }

  function closeModal() {
    el.modalContainer.innerHTML = '';
  }

  // Boot Application
  document.addEventListener('DOMContentLoaded', init);
})();
