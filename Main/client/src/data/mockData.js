export const MOCK_CURRENT_USER = {
  id: 'usr_me',
  name: 'Alex Morgan',
  headline: 'Founder & CEO @ NexusAI | YC W24 Alum | Serial Entrepreneur',
  bio: 'Building the next-generation autonomous AI workflow platform. Passionate about empowering founders, seed investing, and mentoring early-stage startups.',
  role: 'Founder', // Founder, Entrepreneur, Investor, Mentor
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
  cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
  isVerified: true,
  organization: 'NexusAI',
  country: 'United States',
  city: 'San Francisco, CA',
  skills: ['Artificial Intelligence', 'SaaS', 'Venture Capital', 'Product Strategy', 'React', 'Growth Hacking'],
  interests: ['AI', 'SaaS', 'Fintech', 'Climate'],
  followersCount: 3840,
  followingCount: 620,
  connectionsCount: 1240,
  profileCompletion: 85,
  experience: [
    { title: 'Founder & CEO', company: 'NexusAI', period: '2023 - Present', description: 'Scaling autonomous AI agents for enterprise operations. Raised $2.5M Seed.' },
    { title: 'Lead Product Manager', company: 'Stripe', period: '2020 - 2023', description: 'Led Developer Experience team, scaling revenue tools to 500k+ merchants.' }
  ],
  education: [
    { degree: 'B.S. Computer Science & Economics', institution: 'Stanford University', period: '2016 - 2020' }
  ],
  achievements: [
    'Forbes 30 Under 30 (Tech 2024)',
    'Y Combinator W24 Graduate',
    'TechCrunch Disrupt Winner'
  ]
};

export const MOCK_USERS = [
  MOCK_CURRENT_USER,
  {
    id: 'usr_2',
    name: 'Sarah Chen',
    headline: 'General Partner @ Horizon Ventures | DeepTech & SaaS Investor',
    bio: 'Investing $500k - $2M in Seed & Series A AI, ClimateTech, and Enterprise SaaS startups.',
    role: 'Investor',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    cover: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1200',
    isVerified: true,
    organization: 'Horizon Ventures',
    country: 'United States',
    city: 'New York, NY',
    skills: ['Venture Capital', 'Fundraising', 'B2B SaaS', 'Board Governance'],
    interests: ['AI', 'DeepTech', 'Fintech'],
    followersCount: 8900,
    followingCount: 450,
    connectionsCount: 2100,
    checkSize: '$500k - $2M',
    portfolioCount: 24,
    connectionStatus: 'connected'
  },
  {
    id: 'usr_3',
    name: 'Marcus Vance',
    headline: 'Ex-VP Engineering @ Figma | Advisor & Startup Mentor',
    bio: 'Helping early founders build scalable engineering cultures and architecture. 15+ years in Silicon Valley.',
    role: 'Mentor',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    cover: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
    isVerified: true,
    organization: 'Ex-Figma / Self-Employed',
    country: 'United Kingdom',
    city: 'London, UK',
    skills: ['Engineering Leadership', 'Distributed Systems', 'Mentorship', 'CTO Coaching'],
    interests: ['Developer Tools', 'SaaS', 'AI'],
    followersCount: 5400,
    followingCount: 310,
    connectionsCount: 980,
    rating: 4.9,
    sessionsCompleted: 142,
    hourlyRate: '$150 / hr (Free for YC/TrustNet verified)',
    connectionStatus: 'pending_sent'
  },
  {
    id: 'usr_4',
    name: 'Elena Rostova',
    headline: 'CS & AI Scholar @ MIT | Founder of EcoSense (Climate AI)',
    bio: 'Building satellite computer vision models to track deforestation in real-time. Seeking co-founder & pre-seed investors.',
    role: 'Entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200',
    isVerified: true,
    organization: 'MIT EcoLab',
    country: 'United States',
    city: 'Cambridge, MA',
    skills: ['Python', 'PyTorch', 'Computer Vision', 'GIS', 'Climate AI'],
    interests: ['Climate', 'AI', 'Agriculture'],
    followersCount: 1890,
    followingCount: 420,
    connectionsCount: 540,
    hackathonsWon: 6,
    topProjects: ['EcoSense AI', 'SatelliteVision Tool'],
    connectionStatus: 'none'
  },
  {
    id: 'usr_5',
    name: 'David K. Miller',
    headline: 'Co-Founder & CTO @ PayPulse | Ex-PayPal Fintech Lead',
    bio: 'Building cross-border instant stablecoin payment rails for global startups.',
    role: 'Founder',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    cover: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=1200',
    isVerified: true,
    organization: 'PayPulse',
    country: 'Singapore',
    city: 'Singapore',
    skills: ['Blockchain', 'Fintech', 'Smart Contracts', 'Go', 'System Design'],
    interests: ['Fintech', 'Blockchain', 'SaaS'],
    followersCount: 4120,
    followingCount: 380,
    connectionsCount: 1420,
    connectionStatus: 'none'
  }
];

export const MOCK_STARTUPS = [
  {
    id: 'stp_1',
    name: 'NexusAI',
    tagline: 'Autonomous AI workflow agents for modern enterprise teams',
    description: 'NexusAI automatically connects your company databases, Slack, Notion, and email to streamline multi-step customer operations with zero-code AI workflows.',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200',
    banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
    stage: 'Seed',
    industry: 'AI & SaaS',
    location: 'San Francisco, CA',
    fundingRaised: 1850000,
    fundingTarget: 2500000,
    valuation: '$15.0M',
    founder: MOCK_CURRENT_USER,
    teamSize: 12,
    foundedYear: 2023,
    website: 'https://nexusai.example.com',
    pitchDeckUrl: '#',
    techStack: ['React', 'Python', 'FastAPI', 'PostgreSQL', 'TailwindCSS', 'OpenAI API'],
    milestones: [
      { date: 'Q1 2024', title: 'Y Combinator W24 Batch Graduation', status: 'completed' },
      { date: 'Q2 2024', title: 'Crossed $50k MRR across 45 enterprise clients', status: 'completed' },
      { date: 'Q3 2024', title: 'Launch Autonomous Workflow Builder 2.0', status: 'in-progress' },
      { date: 'Q4 2024', title: 'Expand Sales & Growth Team', status: 'upcoming' }
    ],
    gallery: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800'
    ],
    isBookmarked: true
  },
  {
    id: 'stp_2',
    name: 'PayPulse',
    tagline: 'Cross-border instant payout API for global remote platforms',
    description: 'PayPulse enables platforms to pay global contractors in 140+ countries in local currencies or USDC instantly with zero hidden FX fees.',
    logo: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=200',
    banner: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=1200',
    stage: 'Series A',
    industry: 'Fintech',
    location: 'Singapore',
    fundingRaised: 4200000,
    fundingTarget: 5000000,
    valuation: '$32.0M',
    founder: MOCK_USERS[4],
    teamSize: 28,
    foundedYear: 2022,
    website: 'https://paypulse.example.com',
    pitchDeckUrl: '#',
    techStack: ['Go', 'Solidity', 'Node.js', 'AWS', 'Docker'],
    milestones: [
      { date: 'Q4 2023', title: 'Processed $100M+ in volume', status: 'completed' },
      { date: 'Q2 2024', title: 'EU Payment Institution License Granted', status: 'completed' }
    ],
    gallery: [
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=800'
    ],
    isBookmarked: false
  },
  {
    id: 'stp_3',
    name: 'EcoSense AI',
    tagline: 'Real-time satellite monitoring for forest carbon credits',
    description: 'Empowering ESG funds and carbon registries with high-resolution satellite imagery verified by AI physics models.',
    logo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=200',
    banner: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=1200',
    stage: 'Pre-Seed',
    industry: 'ClimateTech',
    location: 'Cambridge, MA',
    fundingRaised: 350000,
    fundingTarget: 750000,
    valuation: '$5.5M',
    founder: MOCK_USERS[3],
    teamSize: 5,
    foundedYear: 2024,
    website: 'https://ecosense.example.com',
    pitchDeckUrl: '#',
    techStack: ['Python', 'PyTorch', 'GDAL', 'React', 'Mapbox'],
    milestones: [
      { date: 'Q2 2024', title: 'MIT Climate Hackathon Winner', status: 'completed' },
      { date: 'Q3 2024', title: 'Pilot with 3 Amazon Carbon Projects', status: 'in-progress' }
    ],
    gallery: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=800'
    ],
    isBookmarked: true
  }
];

export const MOCK_POSTS = [
  {
    id: 'post_1',
    author: MOCK_CURRENT_USER,
    timeAgo: '2 hours ago',
    content: '🚀 Super excited to announce that NexusAI has officially crossed $50,000 MRR! Huge shoutout to our incredible engineering team and early adopters on TrustNet. We are actively hiring 2 Senior Frontend Engineers (React + Tailwind). DM or comment below if interested! 💡✨',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000',
    likesCount: 142,
    commentsCount: 28,
    repostsCount: 15,
    isLiked: true,
    isBookmarked: true,
    comments: [
      { id: 'c1', author: MOCK_USERS[1], text: 'Huge milestone Alex! Congrats to the entire team! 👏', timeAgo: '1 hr ago' },
      { id: 'c2', author: MOCK_USERS[2], text: 'Super well deserved. Loved the product demo last week!', timeAgo: '45 mins ago' }
    ]
  },
  {
    id: 'post_2',
    author: MOCK_USERS[1],
    timeAgo: '5 hours ago',
    content: 'What separates top 1% founders from the rest during fundraising?\n\n1. Obsessive customer clarity.\n2. Understanding exact unit economics early.\n3. Velocity of execution over perfection.\n\nWe are currently writing check sizes between $500k - $2M at Horizon Ventures for Seed AI & B2B SaaS startups. Tag your favorite founders below!',
    image: null,
    likesCount: 389,
    commentsCount: 64,
    repostsCount: 42,
    isLiked: false,
    isBookmarked: false,
    comments: [
      { id: 'c3', author: MOCK_USERS[4], text: 'Spot on Sarah! Great insights on velocity.', timeAgo: '3 hrs ago' }
    ]
  }
];

export const MOCK_COMMUNITIES = [
  {
    id: 'comm_1',
    name: 'AI Founders & Builders Hub',
    description: 'The global community for entrepreneurs building generative AI, LLM tooling, and computer vision startups.',
    category: 'AI & Machine Learning',
    membersCount: 4820,
    banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000',
    icon: 'Bot',
    isJoined: true,
    pinnedPosts: [
      { id: 'pp1', title: 'Community Guidelines & Monthly Pitch Feedback Thread', author: 'Alex Morgan' }
    ]
  },
  {
    id: 'comm_2',
    name: 'Y Combinator Applicants W25',
    description: 'Peer reviews, application tips, interview prep, and founder match for upcoming YC batches.',
    category: 'Startup Accelerators',
    membersCount: 3150,
    banner: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000',
    icon: 'Rocket',
    isJoined: false,
    pinnedPosts: []
  },
  {
    id: 'comm_3',
    name: 'SaaS Growth & Product-Market Fit',
    description: 'Strategies for scaling B2B SaaS from zero to $1M ARR. Pricing, outbound, retention & PLG.',
    category: 'B2B SaaS',
    membersCount: 6200,
    banner: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1000',
    icon: 'TrendingUp',
    isJoined: true,
    pinnedPosts: []
  }
];

export const MOCK_OPPORTUNITIES = [
  {
    id: 'opp_1',
    title: 'Senior Frontend Engineer (React + Tailwind)',
    organization: 'NexusAI',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200',
    type: 'Startup Job', // Startup Job, Co-Founder Search, Investment, Accelerator, Internship, Hackathon
    location: 'San Francisco, CA (Remote Allowed)',
    salary: '$140,000 - $180,000 • 0.5% - 1.2% Equity',
    description: 'We are looking for a world-class React engineer to build complex AI workflow canvas interfaces and real-time dashboard analytics.',
    deadline: 'Aug 15, 2026',
    isBookmarked: true
  },
  {
    id: 'opp_2',
    title: 'Technical Co-Founder (AI / ML Systems)',
    organization: 'EcoSense Climate',
    logo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=200',
    type: 'Co-Founder Search',
    location: 'Boston, MA / Hybrid',
    salary: '25.0% - 40.0% Founder Equity',
    description: 'Partner with MIT scholar to lead PyTorch computer vision satellite modeling infrastructure and secure Seed VC funding.',
    deadline: 'Sep 01, 2026',
    isBookmarked: false
  },
  {
    id: 'opp_3',
    title: 'Y Combinator Winter 2025 Accelerator Program',
    organization: 'Y Combinator',
    logo: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=200',
    type: 'Accelerator Program',
    location: 'San Francisco, CA',
    salary: '$500,000 Investment for 7%',
    description: 'Apply to the world’s leading startup accelerator. 12 weeks of intense mentorship, fundraising guidance, and Demo Day.',
    deadline: 'Oct 10, 2026',
    isBookmarked: true
  }
];

export const MOCK_EVENTS = [
  {
    id: 'evt_1',
    title: 'TrustNet Global AI Founder Pitch Night',
    organizer: 'TrustNet Official',
    date: 'Jul 28, 2026',
    time: '6:00 PM - 8:30 PM PST',
    venue: 'Virtual Zoom / Spatial Web',
    category: 'Pitch Event',
    attendeesCount: 340,
    banner: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000',
    speakers: [
      { name: 'Sarah Chen', role: 'Partner @ Horizon VC' },
      { name: 'Alex Morgan', role: 'CEO @ NexusAI' }
    ],
    isRegistered: true
  },
  {
    id: 'evt_2',
    title: 'B2B SaaS Pricing Masterclass with Ex-Stripe PMs',
    organizer: 'SaaS Builders Hub',
    date: 'Aug 04, 2026',
    time: '11:00 AM - 12:30 PM EST',
    venue: 'Live Interactive Stream',
    category: 'Webinar',
    attendeesCount: 520,
    banner: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000',
    speakers: [
      { name: 'Marcus Vance', role: 'Advisor' }
    ],
    isRegistered: false
  }
];

export const MOCK_MESSAGES = [
  {
    id: 'msg_conv_1',
    partner: MOCK_USERS[1], // Sarah Chen
    unread: 1,
    lastMessage: 'Hey Alex, checked out the pitch deck for NexusAI. Let’s set up a 20-min Zoom call this Thursday!',
    lastTime: '10:42 AM',
    messages: [
      { id: 'm1', senderId: 'usr_2', text: 'Hi Alex, loved your post on reaching $50k MRR.', time: '10:30 AM' },
      { id: 'm2', senderId: 'usr_me', text: 'Thanks Sarah! Appreciate the support. We are opening our Seed expansion round.', time: '10:38 AM' },
      { id: 'm3', senderId: 'usr_2', text: 'Hey Alex, checked out the pitch deck for NexusAI. Let’s set up a 20-min Zoom call this Thursday!', time: '10:42 AM' }
    ]
  },
  {
    id: 'msg_conv_2',
    partner: MOCK_USERS[2], // Marcus Vance
    unread: 0,
    lastMessage: 'Happy to review your tech architecture anytime.',
    lastTime: 'Yesterday',
    messages: [
      { id: 'm4', senderId: 'usr_3', text: 'Great progress on NexusAI!', time: 'Yesterday' },
      { id: 'm5', senderId: 'usr_3', text: 'Happy to review your tech architecture anytime.', time: 'Yesterday' }
    ]
  }
];

export const MOCK_FILES = [
  { id: 'f1', name: 'NexusAI_PitchDeck_2024.pdf', category: 'Pitch Decks', size: '4.2 MB', date: 'Jul 12, 2026', type: 'pdf' },
  { id: 'f2', name: 'NexusAI_Logo_BrandKit.png', category: 'Startup Logos', size: '1.8 MB', date: 'Jun 28, 2026', type: 'image' },
  { id: 'f3', name: 'CapTable_SeedRound_Confidential.xlsx', category: 'Documents', size: '512 KB', date: 'Jul 04, 2026', type: 'spreadsheet' },
  { id: 'f4', name: 'YC_W24_Certificate_Verified.pdf', category: 'Certificates', size: '1.1 MB', date: 'Mar 30, 2024', type: 'pdf' }
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif_1',
    type: 'invite', // invite, mention, verification, message, community
    title: 'Investor Meeting Invitation',
    content: 'Sarah Chen invited you to a 1:1 Pitch Meeting via TrustNet Connect.',
    timeAgo: '15 mins ago',
    isRead: false,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 'notif_2',
    type: 'verification',
    title: 'Founder Badge Verified! Badge',
    content: 'Your Y Combinator W24 Founder credential was successfully verified.',
    timeAgo: '2 hours ago',
    isRead: false,
    avatar: null
  },
  {
    id: 'notif_3',
    type: 'mention',
    title: 'Mentioned in AI Founders Hub',
    content: 'Marcus Vance mentioned you in "Best practices for React + FastAPI state management".',
    timeAgo: '1 day ago',
    isRead: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
  }
];

export const MOCK_ANALYTICS_DATA = {
  profileViews: [
    { day: 'Mon', views: 120, searches: 45 },
    { day: 'Tue', views: 240, searches: 80 },
    { day: 'Wed', views: 350, searches: 110 },
    { day: 'Thu', views: 420, searches: 140 },
    { day: 'Fri', views: 580, searches: 190 },
    { day: 'Sat', views: 490, searches: 160 },
    { day: 'Sun', views: 610, searches: 210 }
  ],
  investorInteractions: [
    { name: 'Pitch Deck Views', count: 184, growth: '+24%' },
    { name: 'Meeting Requests', count: 18, growth: '+12%' },
    { name: 'Profile Shares', count: 95, growth: '+38%' },
    { name: 'Direct Messages', count: 42, growth: '+15%' }
  ]
};
