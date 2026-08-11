import * as mockData from '../data/mockData';

const BASE_URL = 'http://localhost:5000/api';

// Helper to get or initialize localStorage keys
function getStorageItem(key, defaultValue) {
  const item = localStorage.getItem(key);
  if (item === null) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(item);
  } catch (e) {
    return defaultValue;
  }
}

function setStorageItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Intercept local mock endpoints to enable pure frontend flow
async function requestMock(path, method, body = {}) {
  // Simulate minor network delay for realistic experience
  await new Promise(resolve => setTimeout(resolve, 300));

  const [urlPath, queryString] = path.split('?');
  const queryParams = {};
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      queryParams[key] = decodeURIComponent(value);
    });
  }

  // 1. Auth check and endpoints
  if (urlPath === '/auth/me') {
    const currentUser = localStorage.getItem('trustnet_user');
    if (!currentUser) {
      throw new Error('Unauthorized');
    }
    return JSON.parse(currentUser);
  }

  if (urlPath === '/auth/login') {
    const role = body.role || 'Founder';
    const email = body.email || 'alex@nexusai.io';
    const user = {
      ...mockData.MOCK_CURRENT_USER,
      email,
      role,
      isVerified: true
    };
    setStorageItem('trustnet_user', user);
    return { success: true, user };
  }

  if (urlPath === '/auth/signup') {
    const user = {
      ...mockData.MOCK_CURRENT_USER,
      name: body.name || 'Alex Morgan',
      email: body.email || 'alex@nexusai.io',
      role: body.role || 'Founder',
      isVerified: false
    };
    setStorageItem('trustnet_user', user);
    return { success: true, user };
  }

  if (urlPath === '/auth/send-otp' || urlPath === '/auth/verify-otp') {
    return { success: true };
  }

  if (urlPath === '/auth/profile') {
    const currentUser = getStorageItem('trustnet_user', mockData.MOCK_CURRENT_USER);
    const updatedUser = { ...currentUser, ...body };
    setStorageItem('trustnet_user', updatedUser);
    return { success: true, user: updatedUser };
  }

  // 2. Ideas Endpoints (Idea Vault)
  if (urlPath === '/ideas') {
    let ideas = getStorageItem('trustnet_ideas', [
      {
        id: 'idea_1',
        title: 'Decentralized GPU Compute for LLMs',
        description: 'Aggregates idle workstation GPUs into a coherent low-latency cluster for inference.',
        sector: 'Artificial Intelligence',
        businessScore: 89,
        trustScore: 92,
        status: 'Draft',
        createdAt: 'Jul 28, 2026'
      },
      {
        id: 'idea_2',
        title: 'Automated SaaS Audit Compliance',
        description: 'Generates real-time compliance documentation for SOC2 and ISO27001 by tracking github commits.',
        sector: 'B2B SaaS',
        businessScore: 78,
        trustScore: 85,
        status: 'Validated',
        createdAt: 'Jul 29, 2026'
      }
    ]);

    if (method === 'GET') {
      return ideas;
    }

    if (method === 'POST') {
      const newIdea = {
        id: 'idea_' + Date.now(),
        title: body.title,
        description: body.description,
        sector: body.sector,
        businessScore: body.businessScore || 70,
        trustScore: body.trustScore || 75,
        status: body.status || 'Draft',
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      ideas.push(newIdea);
      setStorageItem('trustnet_ideas', ideas);
      return newIdea;
    }
  }

  if (urlPath.startsWith('/ideas/')) {
    const ideaId = urlPath.split('/')[2];
    let ideas = getStorageItem('trustnet_ideas', []);

    if (method === 'DELETE') {
      ideas = ideas.filter(i => i.id !== ideaId);
      setStorageItem('trustnet_ideas', ideas);
      return { success: true };
    }

    if (method === 'PUT') {
      let updatedIdea = null;
      ideas = ideas.map(i => {
        if (i.id === ideaId) {
          updatedIdea = { ...i, ...body };
          return updatedIdea;
        }
        return i;
      });
      setStorageItem('trustnet_ideas', ideas);
      return updatedIdea;
    }
  }

  // 3. AI Coach Endpoints
  if (urlPath === '/coach/history') {
    return getStorageItem('trustnet_coach_history', [
      'Validate our pricing strategy',
      'Generate target market suggestions',
      'SWOT review of EcoSense',
      'Estimate server infrastructure costs'
    ]);
  }

  if (urlPath === '/coach/canvas') {
    return {
      keyPartners: ['AWS', 'Stripe', 'OpenAI'],
      keyActivities: ['Model Training', 'UX Design', 'Customer Onboarding'],
      valuePropositions: ['Instant Workflow Automation', 'Secure Data Integrations', 'Vetted Business Credibility'],
      customerRelationships: ['Self-Service SaaS', 'Dedicated Slack Channels', 'AI Strategy Coach Chat'],
      customerSegments: ['Mid-Market Tech', 'Enterprise Ops Teams', 'Early Founders'],
      revenueStreams: ['Subscription Plans (Pro/Startup)', 'Custom Integration Add-ons', 'VC Deal-flow Match Fees']
    };
  }

  if (urlPath === '/coach/health') {
    return {
      marketPotential: 88,
      teamStrength: 92,
      revenueGrowth: 75,
      innovationIndex: 90,
      competitionDefense: 80,
      growthVelocity: 85,
      investorReadiness: 78
    };
  }

  if (urlPath === '/coach/message') {
    const text = body.messageText || '';
    let content = "I can help with SWOT analysis, business canvas models, or evaluating market potential. What area of your startup shall we address next?";
    if (text.toLowerCase().includes('canvas')) {
      content = "I've analyzed your Business Model Canvas. Your value proposition of instant workflow automation is solid. Focus on the 'Customer Segments' to refine B2B sales cycles.";
    } else if (text.toLowerCase().includes('pricing')) {
      content = "Value-based pricing is best. I recommend three tiers: Free, Pro Founder (₹499), and Startup Pro (₹1,999). Keep transaction costs low to maintain a healthy unit economics profile.";
    } else if (text.toLowerCase().includes('swot') || text.toLowerCase().includes('health')) {
      content = "Based on your Startup Health metrics, your team strength (92%) is highly rated. Your primary risk is runway and financials. A targeted Seed expansion is highly recommended.";
    }
    const coachHistory = getStorageItem('trustnet_coach_history', []);
    if (!coachHistory.includes(text) && text.trim().length > 3) {
      coachHistory.unshift(text);
      setStorageItem('trustnet_coach_history', coachHistory.slice(0, 10));
    }
    return {
      id: 'coach_' + Date.now(),
      role: 'assistant',
      content,
      timestamp: 'Just now'
    };
  }

  // 4. Core SaaS Entities
  if (urlPath === '/startups') {
    let startups = getStorageItem('trustnet_startups', mockData.MOCK_STARTUPS);
    if (method === 'GET') {
      return startups;
    }
    if (method === 'POST') {
      const newStartup = {
        ...body,
        id: 'stp_' + Date.now(),
        logo: body.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200',
        banner: body.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
        fundingRaised: Number(body.fundingRaised || 0),
        fundingTarget: Number(body.fundingTarget || 100000),
        valuation: body.valuation || '$1.0M',
        stage: body.stage || 'Pre-Seed',
        industry: body.industry || 'AI & SaaS',
        location: body.location || 'San Francisco, CA',
        milestones: body.milestones || [],
        techStack: body.techStack || [],
        gallery: [],
        isBookmarked: false
      };
      startups.unshift(newStartup);
      setStorageItem('trustnet_startups', startups);
      return newStartup;
    }
  }

  if (urlPath.startsWith('/startups/') && urlPath.endsWith('/bookmark')) {
    const startupId = urlPath.split('/')[2];
    const startups = getStorageItem('trustnet_startups', mockData.MOCK_STARTUPS);
    const updated = startups.map(s => s.id === startupId ? { ...s, isBookmarked: !s.isBookmarked } : s);
    setStorageItem('trustnet_startups', updated);
    return { success: true };
  }

  if (urlPath === '/posts') {
    let posts = getStorageItem('trustnet_posts', mockData.MOCK_POSTS);
    if (method === 'GET') {
      return posts;
    }
    if (method === 'POST') {
      const user = getStorageItem('trustnet_user', mockData.MOCK_CURRENT_USER);
      const newPost = {
        id: 'post_' + Date.now(),
        author: user,
        timeAgo: 'Just now',
        content: body.content,
        image: body.image || null,
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        isLiked: false,
        isBookmarked: false,
        comments: []
      };
      posts.unshift(newPost);
      setStorageItem('trustnet_posts', posts);
      return newPost;
    }
  }

  if (urlPath.startsWith('/posts/')) {
    const parts = urlPath.split('/');
    const postId = parts[2];
    const action = parts[3];
    const posts = getStorageItem('trustnet_posts', mockData.MOCK_POSTS);

    if (action === 'like') {
      const updated = posts.map(p => {
        if (p.id === postId) {
          const isLiked = !p.isLiked;
          return {
            ...p,
            isLiked,
            likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1
          };
        }
        return p;
      });
      setStorageItem('trustnet_posts', updated);
      return { success: true };
    }

    if (action === 'bookmark') {
      const updated = posts.map(p => p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p);
      setStorageItem('trustnet_posts', updated);
      return { success: true };
    }

    if (action === 'comment') {
      let newComment = null;
      const user = getStorageItem('trustnet_user', mockData.MOCK_CURRENT_USER);
      const updated = posts.map(p => {
        if (p.id === postId) {
          newComment = {
            id: 'c_' + Date.now(),
            author: user,
            text: body.text,
            timeAgo: 'Just now'
          };
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [...p.comments, newComment]
          };
        }
        return p;
      });
      setStorageItem('trustnet_posts', updated);
      return newComment;
    }
  }

  if (urlPath === '/communities') {
    return getStorageItem('trustnet_communities', mockData.MOCK_COMMUNITIES);
  }

  if (urlPath === '/opportunities') {
    return getStorageItem('trustnet_opportunities', mockData.MOCK_OPPORTUNITIES);
  }

  if (urlPath.startsWith('/opportunities/') && urlPath.endsWith('/bookmark')) {
    const oppId = urlPath.split('/')[2];
    const opps = getStorageItem('trustnet_opportunities', mockData.MOCK_OPPORTUNITIES);
    const updated = opps.map(o => o.id === oppId ? { ...o, isBookmarked: !o.isBookmarked } : o);
    setStorageItem('trustnet_opportunities', updated);
    return { success: true };
  }

  if (urlPath === '/events') {
    return getStorageItem('trustnet_events', mockData.MOCK_EVENTS);
  }

  if (urlPath.startsWith('/events/') && urlPath.endsWith('/register')) {
    const eventId = urlPath.split('/')[2];
    const events = getStorageItem('trustnet_events', mockData.MOCK_EVENTS);
    const updated = events.map(e => e.id === eventId ? { ...e, isRegistered: !e.isRegistered } : e);
    setStorageItem('trustnet_events', updated);
    return { success: true };
  }

  if (urlPath === '/messages') {
    let conversations = getStorageItem('trustnet_conversations', mockData.MOCK_MESSAGES);
    if (method === 'GET') {
      return conversations;
    }
    if (method === 'POST') {
      const { conversationId, text } = body;
      let newMsg = null;
      conversations = conversations.map(c => {
        if (c.id === conversationId) {
          newMsg = {
            id: 'm_' + Date.now(),
            senderId: 'usr_me',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          return {
            ...c,
            lastMessage: text,
            lastTime: newMsg.time,
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      });
      setStorageItem('trustnet_conversations', conversations);
      return { success: true, message: newMsg };
    }
  }

  if (urlPath === '/notifications') {
    return getStorageItem('trustnet_notifications', mockData.MOCK_NOTIFICATIONS);
  }

  if (urlPath === '/users') {
    return getStorageItem('trustnet_users', mockData.MOCK_USERS);
  }

  if (urlPath.startsWith('/users/connections')) {
    const { userId, status } = body;
    const users = getStorageItem('trustnet_users', mockData.MOCK_USERS);
    const updated = users.map(u => u.id === userId ? { ...u, connectionStatus: status } : u);
    setStorageItem('trustnet_users', updated);
    return { success: true };
  }

  if (urlPath === '/files') {
    return getStorageItem('trustnet_files', mockData.MOCK_FILES);
  }

  // 5. Billing Endpoints
  if (urlPath === '/billing') {
    const user = getStorageItem('trustnet_user', mockData.MOCK_CURRENT_USER);
    return {
      currentPlan: user.plan || 'Free',
      trialEnds: null,
      invoices: getStorageItem('trustnet_invoices', [
        { id: 'inv_1', date: 'Jul 01, 2026', description: 'TrustNet Free Tier', amount: '₹0', status: 'Paid' }
      ])
    };
  }

  if (urlPath === '/billing/upgrade') {
    const user = getStorageItem('trustnet_user', mockData.MOCK_CURRENT_USER);
    user.plan = body.planName;
    setStorageItem('trustnet_user', user);

    const invoice = {
      id: 'inv_' + Date.now(),
      date: 'Just now',
      description: `TrustNet ${body.planName} Plan Upgrade`,
      amount: body.planName === 'Pro Founder' ? '₹499' : body.planName === 'Startup Pro' ? '₹1,999' : '₹4,999',
      status: 'Paid'
    };
    const invoices = getStorageItem('trustnet_invoices', []);
    invoices.unshift(invoice);
    setStorageItem('trustnet_invoices', invoices);

    return {
      success: true,
      plan: body.planName,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
  }

  // 6. Challenges Endpoints
  if (urlPath === '/challenges') {
    return {
      challenges: [
        { id: 'ch_1', title: 'Generative AI Pipeline Optimizer', sponsor: 'Google Cloud', prize: '$10,000 + Credits', description: 'Optimize LLM token latency using decentralized caching protocols.', participantCount: 42, difficulty: 'Hard', logo: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?auto=format&fit=crop&q=80&w=200' },
        { id: 'ch_2', title: 'Predictive Climate Carbon Credit Model', sponsor: 'EcoForce Foundation', prize: '$5,000 + Pilot', description: 'Analyze computer vision data to predict carbon capacity of regional forest sections.', participantCount: 19, difficulty: 'Medium', logo: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=200' }
      ],
      leaderboard: [
        { rank: 1, name: 'EcoSense', score: 980, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
        { rank: 2, name: 'PayPulse', score: 940, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
        { rank: 3, name: 'NexusAI', score: 890, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' }
      ]
    };
  }

  if (urlPath.startsWith('/challenges/') && urlPath.endsWith('/submit')) {
    return { success: true };
  }

  // 7. Equity Endpoints
  if (urlPath === '/equity') {
    return {
      templates: [
        { id: 't1', name: 'FAST (Founder/Advisor Standard Template)', type: 'PDF Template' },
        { id: 't2', name: 'Delaware C-Corp Incorporation Template', type: 'DOCX Document' },
        { id: 't3', name: 'Mutual NDA Agreement Template', type: 'PDF Document' }
      ],
      offers: getStorageItem('trustnet_equity_offers', [
        { id: 'off_1', partner: 'Sarah Chen', role: 'Advisor', equity: 1.5, vesting: '2-year vesting, monthly', status: 'Pending' }
      ])
    };
  }

  if (urlPath === '/equity/offers') {
    const offer = {
      id: 'off_' + Date.now(),
      partner: body.partnerName,
      role: body.role,
      equity: body.equity,
      vesting: body.vesting,
      status: 'Pending'
    };
    const offers = getStorageItem('trustnet_equity_offers', []);
    offers.unshift(offer);
    setStorageItem('trustnet_equity_offers', offers);
    return { success: true, offer };
  }

  // 8. Marketplace Endpoints
  if (urlPath === '/marketplace') {
    return [
      { id: 'mkt_1', title: 'Senior Full Stack Developer (Next.js/Node)', category: 'Developers', startup: 'NexusAI', tags: ['React', 'Node', 'Vite'], budget: '₹60,000 - ₹120,000/mo', description: 'Experienced React developer needed to design and scale the marketplace workspace dashboard.', author: 'Alex Morgan' },
      { id: 'mkt_2', title: 'Startup Incorporation & Tax Consultant', category: 'Lawyers', startup: 'LawFlex', tags: ['Legal', 'Incorporation', 'Equity'], budget: '₹15,000 (Flat Fee)', description: 'Filing Delaware C-Corp and structuring early founder equity agreement templates.', author: 'Marcus Vance' },
      { id: 'mkt_3', title: 'UX/UI Designer (Figma Web/App)', category: 'Designers', startup: 'DesignFlow', tags: ['Figma', 'UI', 'Mobile'], budget: '₹40,000/project', description: 'Redesigning landing page elements for high converting mobile app sign-ups.', author: 'Sarah Chen' }
    ];
  }

  if (urlPath.startsWith('/marketplace/') && urlPath.endsWith('/contact')) {
    return { success: true };
  }

  // 9. Rooms Endpoints
  if (urlPath === '/rooms') {
    return getStorageItem('trustnet_rooms', [
      {
        id: 'room_1',
        title: 'Seed Round Pitch Practice',
        description: 'A mock Q&A session with active mentors to refine our seed fundraising pitch.',
        category: 'Pitch Practice',
        messages: [
          { id: 'rm_m1', sender: 'Marcus Vance', text: 'Let’s look at your slide 4 (traction). Highlight the MRR growth first.', time: '12:00 PM' }
        ],
        tasks: [
          { id: 'rm_t1', title: 'Refine financial model projection slide', done: true },
          { id: 'rm_t2', title: 'Practice pitch in front of mirror 5 times', done: false }
        ],
        activityLogs: [
          { text: 'Marcus Vance joined the room.', time: '11:55 AM' }
        ],
        whiteboardPaths: []
      },
      {
        id: 'room_2',
        title: 'Investor Q&A - Horizon Ventures',
        description: 'An open session where Sarah Chen answers founder questions about pre-seed criteria.',
        category: 'Investor Q&A',
        messages: [],
        tasks: [],
        activityLogs: [],
        whiteboardPaths: []
      }
    ]);
  }

  if (urlPath === '/rooms' && method === 'POST') {
    const rooms = getStorageItem('trustnet_rooms', []);
    const newRoom = {
      id: 'room_' + Date.now(),
      title: body.title,
      description: body.description,
      category: body.category,
      messages: [],
      tasks: [],
      activityLogs: [
        { text: 'Room created successfully.', time: 'Just now' }
      ],
      whiteboardPaths: []
    };
    rooms.push(newRoom);
    setStorageItem('trustnet_rooms', rooms);
    return newRoom;
  }

  if (urlPath.startsWith('/rooms/') && urlPath.endsWith('/messages')) {
    const roomId = urlPath.split('/')[2];
    const rooms = getStorageItem('trustnet_rooms', []);
    let updatedRoom = null;
    const updated = rooms.map(r => {
      if (r.id === roomId) {
        const newMsg = {
          id: 'rm_m_' + Date.now(),
          sender: body.sender || 'Alex Morgan',
          text: body.text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        updatedRoom = {
          ...r,
          messages: [...r.messages, newMsg]
        };
        return updatedRoom;
      }
      return r;
    });
    setStorageItem('trustnet_rooms', updated);
    return updatedRoom;
  }

  if (urlPath.startsWith('/rooms/') && urlPath.endsWith('/tasks')) {
    const roomId = urlPath.split('/')[2];
    const rooms = getStorageItem('trustnet_rooms', []);
    let updatedRoom = null;
    const updated = rooms.map(r => {
      if (r.id === roomId) {
        let tasks = [...r.tasks];
        if (body.title) {
          tasks.push({
            id: 'rm_t_' + Date.now(),
            title: body.title,
            done: false
          });
        } else if (body.taskId) {
          tasks = tasks.map(t => t.id === body.taskId ? { ...t, done: body.done } : t);
        }
        updatedRoom = {
          ...r,
          tasks
        };
        return updatedRoom;
      }
      return r;
    });
    setStorageItem('trustnet_rooms', updated);
    return updatedRoom;
  }

  // 10. Search Endpoint
  if (urlPath === '/search') {
    const query = (queryParams.query || '').toLowerCase();
    const startups = getStorageItem('trustnet_startups', mockData.MOCK_STARTUPS);
    const users = getStorageItem('trustnet_users', mockData.MOCK_USERS);
    
    const matchedStartups = startups.filter(s => s.name.toLowerCase().includes(query) || s.tagline.toLowerCase().includes(query));
    const matchedUsers = users.filter(u => u.name.toLowerCase().includes(query) || u.headline.toLowerCase().includes(query));

    return {
      startups: matchedStartups,
      users: matchedUsers
    };
  }

  // Default fallback
  if (method === 'GET') return [];
  return { success: true };
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.warn(`[API CLIENT] Backend server at ${url} not available. Falling back to client-side mock database...`);
    
    let parsedBody = {};
    if (config.body) {
      try {
        parsedBody = typeof config.body === 'string' ? JSON.parse(config.body) : config.body;
      } catch (e) {
        parsedBody = config.body;
      }
    }
    return await requestMock(path, config.method || 'GET', parsedBody);
  }
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
