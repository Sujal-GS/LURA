# Lura 🌌

**Nothing lasts. Be real.**

Lura is a premium, minimalist social media platform designed for authentic sharing and exclusive content. Built with a focus on aesthetics and privacy, Lura offers a sleek dark-mode experience with advanced features like ephemeral stories, anonymous posting, and a curated "Lura+" premium ecosystem.

### 🚀 [Access the Web App (Live Demo)](https://lura-six.vercel.app/login)

> [!WARNING]
> **🚧 Under Active Development**: This is currently a **Preview/Beta** version of the web app. Expect bugs and unfinished features as we refine the experience. Some features may be removed or replaced as development progresses.
> 
> **🤝 Contributions**: We welcome contributions! Feel free to open issues or submit pull requests to help improve Lura.
>
> **📱 Coming Soon**: A native **Android version** of Lura is currently in development and will be released soon!
>
> **⚠️ Usage & Conduct**: 
> - **Be Considerate**: Be respectful in what you post. Lura is a space for authentic connection, not conflict.
> - **Storage Conscious**: Due to **storage limitations**, please post sparingly. Avoid uploading extremely large files or duplicate content.
> - **No Harassment**: Bullying, hate speech, or targeted harassment of any kind will not be tolerated.
> - **Content Standards**: Posting NSFW, illegal, or highly graphic content is strictly prohibited.
> - **No Spam or Botting**: Automated posting, spamming comments, or attempting to manipulate the "Trending" algorithm will result in removal.
> - **Authenticity**: While Anonymity is allowed, impersonating real individuals or organizations to spread misinformation is forbidden.
> - **Permanent Bans**: Any violation of these standards will result in an immediate and permanent ban from the platform.

---

## 📸 Showcase

### The Experience
![Landing Page](public/screenshot1.png)
*Experience Lura - The minimalist entry point to the platform.*

### The Feed
![Home Feed](public/screenshot2.png)
*A sleek, distraction-free feed featuring high-quality media and anonymous interactions.*

---

## ✨ Features

### 🌐 Core Features (Available to All)
- **👤 True Anonymity**: Share thoughts and media freely without revealing your identity. Anonymous posts are marked with a distinct purple shroud, ensuring your privacy is never compromised.
- **🌀 Ephemeral Stories**: Share moments that disappear after 24 hours.
- **📱 Modern Interactions**: 
  - Double-tap to like with a custom glowing ripple animation.
  - Integrated Direct Messaging system for private conversations.
  - Real-time notifications and activity tracking.
- **🔍 Intelligent Discovery**: An algorithmic "Trending" feed that surfaces popular content while keeping recent posts at the forefront.

### 💎 Lura+ Premium
*Unlock the full potential of the platform with our exclusive tier. Please note that Lura+ features are dynamic; new capabilities may be introduced, and existing ones may be removed or replaced as the service evolves.*
- **👻 Ghost Mode**: Browse the platform and view stories without leaving a trace.
- **🏰 Exclusive Content**: Access to premium-only posts and media.
- **⏳ Extended Stories**: Keep your moments alive longer with 72-hour story visibility.
- **👑 Elite Presence**: Stand out with golden profile badges (Crown) and glowing golden borders.
- **⚡ Priority Reach**: Enjoy increased visibility in the discovery feed.

> [!IMPORTANT]
> **Demo Only**: Any pricing or payment information shown within the app is for **demonstration purposes only** and is not real. To enable Lura+ Premium features for your account, please contact the developer.

---

## 🛠 Tech Stack

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) (for smooth, high-end animations)
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, Realtime)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)

---

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS)
- A Supabase project

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sujal-GS/LURA.git
   cd LURA
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

---

## 🛡 Security & Privacy

Lura uses Supabase Row Level Security (RLS) to ensure that:
- Users can only edit or delete their own content.
- Anonymous posts truly mask the author's identity from the frontend.
- Premium content is only accessible to authorized subscribers.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

Developed with ❤️ by [Sujal-GS](https://github.com/Sujal-GS)

---
*For Lura+ Premium access or inquiries, please contact the developer directly.*
