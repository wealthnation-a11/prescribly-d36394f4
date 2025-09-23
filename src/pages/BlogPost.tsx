import { useParams, Link } from "react-router-dom";
import { usePageSEO } from "@/hooks/usePageSEO";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Calendar, User } from "lucide-react";

const blogPosts = {
  "telemedicine-transforming-healthcare-2025": {
    title: "5 Ways Telemedicine is Transforming Healthcare in 2025",
    excerpt: "From faster triage to continuous care, telemedicine is reshaping patient experience and outcomes.",
    content: `
      <h2>The Digital Health Revolution Continues</h2>
      <p>As we advance through 2025, telemedicine continues to revolutionize how we deliver and receive healthcare. What started as an emergency response to the pandemic has evolved into a sophisticated ecosystem of digital health solutions.</p>
      
      <h3>1. AI-Powered Diagnostic Support</h3>
      <p>Modern telemedicine platforms now integrate advanced AI algorithms that assist doctors in making more accurate diagnoses. These systems can analyze symptoms, medical history, and even visual cues to provide preliminary assessments before the consultation begins.</p>
      
      <h3>2. Continuous Remote Monitoring</h3>
      <p>Wearable devices and IoT health sensors enable continuous monitoring of patients' vital signs, creating a comprehensive picture of their health status between appointments.</p>
      
      <h3>3. Integrated Electronic Health Records</h3>
      <p>Seamless integration with EHR systems ensures that all patient data is instantly accessible during virtual consultations, improving care continuity and reducing administrative overhead.</p>
      
      <h3>4. Specialized Virtual Clinics</h3>
      <p>Healthcare providers are establishing specialized virtual clinics for chronic disease management, mental health support, and preventive care programs.</p>
      
      <h3>5. Enhanced Security and Privacy</h3>
      <p>Advanced encryption and security protocols ensure that patient data remains protected while enabling efficient healthcare delivery across digital platforms.</p>
      
      <p>The future of healthcare is digital, and telemedicine platforms like Prescribly are leading the charge in making quality healthcare accessible to everyone, anywhere.</p>
    `,
    author: "Dr. Sarah Johnson",
    date: "March 15, 2025",
    image: "/placeholder.svg"
  },
  "data-privacy-digital-health": {
    title: "The Importance of Data Privacy in Digital Health",
    excerpt: "As care moves online, patient trust depends on strong security and transparent data practices.",
    content: `
      <h2>Building Trust Through Security</h2>
      <p>In the digital health era, protecting patient data isn't just a legal requirement—it's the foundation of trust between healthcare providers and patients.</p>
      
      <h3>The Current Landscape</h3>
      <p>Healthcare organizations handle some of the most sensitive personal information, from medical histories to genetic data. With cyber threats increasing, robust security measures are more critical than ever.</p>
      
      <h3>Key Privacy Principles</h3>
      <ul>
        <li><strong>Data Minimization:</strong> Collect only the data necessary for providing care</li>
        <li><strong>Consent Management:</strong> Clear, granular consent for all data usage</li>
        <li><strong>Transparency:</strong> Open communication about how data is used and protected</li>
        <li><strong>Security by Design:</strong> Building privacy protection into every system from the ground up</li>
      </ul>
      
      <h3>Regulatory Compliance</h3>
      <p>Healthcare platforms must comply with multiple regulations including HIPAA, GDPR, and emerging state privacy laws. This requires ongoing investment in security infrastructure and staff training.</p>
      
      <h3>Patient Rights</h3>
      <p>Patients have the right to know how their data is being used, to request corrections, and to have their data deleted when legally permissible. Transparent privacy policies and easy-to-use privacy controls are essential.</p>
      
      <p>At Prescribly, we believe that strong privacy protection and excellent healthcare delivery go hand in hand. Our commitment to security helps patients feel confident in using digital health tools.</p>
    `,
    author: "Michael Chen, Privacy Officer",
    date: "March 10, 2025",
    image: "/placeholder.svg"
  },
  "prescribly-doctors-better-consultations": {
    title: "How Prescribly Doctors Deliver Better Consultations",
    excerpt: "Tools that reduce admin overhead, surface context instantly, and keep visits focused on care.",
    content: `
      <h2>Empowering Healthcare Providers</h2>
      <p>Great healthcare technology doesn't replace doctors—it empowers them to focus on what they do best: caring for patients. Here's how Prescribly's platform enhances the consultation experience.</p>
      
      <h3>Streamlined Administrative Tasks</h3>
      <p>Our platform automates routine administrative tasks, from appointment scheduling to insurance verification, giving doctors more time to focus on patient care.</p>
      
      <h3>Intelligent Patient Insights</h3>
      <p>Before each consultation, doctors receive AI-generated insights about the patient's symptoms, medical history, and potential concerns, enabling more focused and efficient appointments.</p>
      
      <h3>Real-Time Decision Support</h3>
      <p>During consultations, doctors have access to clinical decision support tools, drug interaction checkers, and treatment guidelines that help ensure the best possible care.</p>
      
      <h3>Seamless Documentation</h3>
      <p>AI-powered documentation tools help doctors capture consultation notes quickly and accurately, reducing time spent on paperwork after appointments.</p>
      
      <h3>Collaborative Care Features</h3>
      <p>When complex cases require specialist input, our platform facilitates easy collaboration between healthcare providers, improving outcomes for patients with complex conditions.</p>
      
      <h3>Continuous Learning</h3>
      <p>The platform provides analytics and insights that help doctors track their practice patterns and outcomes, supporting continuous improvement in care delivery.</p>
      
      <p>By reducing administrative burden and enhancing clinical capabilities, Prescribly enables doctors to spend more quality time with each patient while maintaining the highest standards of care.</p>
    `,
    author: "Dr. Lisa Park, Chief Medical Officer",
    date: "March 5, 2025",
    image: "/placeholder.svg"
  }
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? blogPosts[slug as keyof typeof blogPosts] : null;

  usePageSEO({
    title: post ? `${post.title} | Prescribly Blog` : "Blog Post Not Found | Prescribly",
    description: post?.excerpt || "Blog post not found",
    canonicalPath: `/blog/${slug}`,
  });

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-6">The blog post you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/blog">Back to Blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-secondary/30 border-b border-border/50">
        <div className="container mx-auto px-4 py-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/blog">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
          <h1 className="text-4xl font-bold text-foreground mb-4">{post.title}</h1>
          <div className="flex items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{post.date}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <article className="max-w-4xl mx-auto">
          <img 
            src={post.image} 
            alt={post.title} 
            className="w-full h-64 object-cover rounded-lg mb-8 bg-secondary/50" 
          />
          
          <div 
            className="prose prose-lg max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Written by</p>
                <p className="font-semibold text-foreground">{post.author}</p>
              </div>
              <Button asChild>
                <Link to="/blog">More Articles</Link>
              </Button>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}