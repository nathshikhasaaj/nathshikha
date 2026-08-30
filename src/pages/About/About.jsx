import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Heart,
  Gem,
  Award,
  Users,
  Quote,
  MessageSquare,
  Store,
  Crown,
  Palette,
  Feather,
  Instagram,
  Facebook
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './About.css';

export default function About() {
  const { lang } = useLanguage();
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '919699668421';
  const isMarathi = lang === 'mr';

  const content = isMarathi
    ? {
        heroBadge: "'नथशिखा' (पूर्वीची नखरेवाली) मध्ये तुमचे स्वागत आहे",
        heroTitleLine1: 'तेच नखरे, तेच प्रेम... ',
        heroTitleLine2: 'फक्त एक नवीन नाव!',
        heroSubtitle:
          'प्रत्येक स्त्रीच्या मनातला तो गोड नखरा, तिचा डौल आणि तिची आवडती स्टाइल... खास तुमच्यासाठी तयार केलेल्या हाताने बनवलेल्या अस्सल दागिन्यांसह!',
        stats: [
          { num: '५००+', label: 'आनंदी कुटुंबे' },
          { num: '१००%', label: 'हाताने घडवलेले दागिने' },
          { num: '२०२४', label: 'प्रवासाची सुरुवात' },
          { num: '५★', label: 'विश्वास आणि प्रेम' }
        ],
        founderName: 'श्वेता दरेकर',
        founderRole: 'फाउंडर आणि डिझायनर, नथशिखा',
        craftStamp: 'अस्सल महाराष्ट्रीयन हस्तकला',
        chapter1Eyebrow: 'भाग १: मनातला तो एक विचार',
        chapter1Heading: '"आपण स्वतःचं काहीतरी सुरू करू शकू का?"',
        chapter1P1:
          'MCA चं शिक्षण पूर्ण झालं, UI/UX डिझायनर म्हणून कामही सुरू होतं. कागदावर सगळं काही छान आणि सेट दिसत होतं. पण मनात कुठेतरी एकच विचार सारखा घोळत होता—',
        chapter1P1Bold:
          'स्वतःच्या हिमतीवर काहीतरी उभं करायचंय, स्वतःची बॉस स्वतःच व्हायचंय!',
        chapter1P2:
          'प्रामाणिकपणे सांगायचं तर, हा प्रवास सोपा नव्हता. काही कल्पना फोल ठरल्या, काही प्रयत्न अयशस्वी झाले. पण प्रत्येक अनुभवाने मला एक गोष्ट शिकवली—',
        chapter1P2Bold:
          'जेव्हा तुम्ही मनापासून आणि स्वतःच्या हातांनी काही घडवता, तेव्हा खरी जादू घडते.',
        chapter2Eyebrow: "भाग २: 'नखरेवाली'चा तो प्रवास (२०२४)",
        chapter2Heading:
          '"हे खरंच चालेल का?" या शंकेपासून ५००+ आनंदी ग्राहकांपर्यंतचा प्रवास!',
        chapter2P1Pre: '२०२४ मध्ये, ज्वेलरी मेकिंगचा कोणताही आधीचा अनुभव नसताना, फक्त जिद्द आणि एका छोट्या इन्स्टाग्राम पेजवरून ',
        chapter2P1Bold: "'नखरेवाली'चा जन्म झाला.",
        chapter2P2Pre: "यामागचा विचार एकदम साधा होता: ",
        chapter2P2Quote: "'नखरा'",
        chapter2P2Post:
          ' म्हणजे उगाच दाखवलेला रुबाब नाही, तर प्रत्येक स्त्रीचा स्वतःवर असलेला विश्वास आणि तिचं सौंदर्य आहे! मला नेमका याच नखऱ्याला साजेशी अशी हस्तकला तयार करायची होती.',
        chapter2P3Pre: "एक ",
        chapter2P3SideHustle: "'साइड हसल' (Side Hustle)",
        chapter2P3Post:
          ' म्हणून सुरू झालेला हा प्रवास एका रोलर-कोस्टरसारखा ठरला. रात्री-अपरात्री काम करणं, नवनवीन डिझाईन्स शिकणं आणि तुमच्यासारख्या हजारो सुंदर स्त्रियांसोबत जोडलं जाणं... बघता बघता ',
        chapter2P3Bold: '१ ऑर्डरच्या ५०० हून अधिक ऑर्डर्स झाल्या.',
        evolutionEyebrow: '✦ ब्रँडचा पुनर्जन्म ✦',
        evolutionHeading: "'नखरेवाली' ते 'नथशिखा' : नवं नाव का?",
        evolutionLead: (
          <>
            जसं आपल्या कुटुंबाचा विस्तार झाला, तशी स्वप्नंही मोठी झाली. नथीच्या मोहापासून ते साजशृंगाराच्या शिखरापर्यंत... म्हणजेच <b>'नथशिखा'</b>! 'नथ'पासून ते 'शिखा'पर्यंत —स्त्रीच्या संपूर्ण सौंदर्याला आणि तिच्या प्रत्येक रूपाला सन्मान देणारं नाव आम्हाला हवं होतं, म्हणून आम्ही निवडलं <b>'नथशिखा'</b>.
          </>
        ),
        promises: [
          {
            icon: Heart,
            title: 'प्रेम तेच आहे',
            desc: 'ते दागिने घडवणारे हातही तेच आहेत आणि प्रत्येक दागिन्यामागील आपुलकीची भावनाही तीच आहे.'
          },
          {
            icon: Award,
            title: 'तीच सर्वोत्तम क्वालिटी',
            desc: 'हाताने केलेल्या अस्सल नक्षीकामाची आणि दीर्घकाळ चमकणाऱ्या उत्कृष्ट फिनिशिंगची आमची १००% खात्री.'
          },
          {
            icon: Sparkles,
            title: 'फक्त एक नवं सुंदर नाव',
            desc: 'आपल्या या लाडक्या प्रवासाला आणि वाढत्या परिवाराला आपण एक नवं, समृद्ध आणि सुंदर नाव दिलं आहे.'
          }
        ],
        valuesEyebrow: '✦ आमची तत्त्वे ✦',
        valuesHeading: 'आमची मूल्ये (Our Values)',
        valuesLead:
          'प्रत्येक दागिना घडवताना आणि ग्राहकापर्यंत पोहोचवताना आम्ही या चार मूल्यांची सदैव जपणूक करतो:',
        valuesList: [
          {
            num: '०१',
            icon: Palette,
            title: 'मनापासून हस्तनिर्मित',
            sub: 'Handcrafted with Heart',
            desc: 'फॅक्टरीमध्ये मशीनवर बनवलेले नाही, तर प्रत्येक दागिना प्रेमाने आणि काळजीपूर्वक हाताने घडवला जातो.'
          },
          {
            num: '०२',
            icon: Crown,
            title: 'परंपरा आणि आधुनिकतेचा संगम',
            sub: 'Tradition Meets Modern Style',
            desc: 'पारंपारिक महाराष्ट्रीयन दागिन्यांना आधुनिक डिझाइनचा डौल देऊन प्रत्येक पिढीसाठी आकर्षक बनवतो.'
          },
          {
            num: '०३',
            icon: Users,
            title: 'प्रत्येक ग्राहकाशी आपुलकीचे नाते',
            sub: 'Customer First & Trust',
            desc: 'फक्त उत्पादन विकणे नाही, तर प्रत्येक स्त्रीचा आनंद, समाधान आणि विश्वास जपणे हीच आमची प्राथमिकता आहे.'
          },
          {
            num: '०४',
            icon: Gem,
            title: 'प्रामाणिक गुणवत्ता',
            sub: 'Pure Artisanal Quality',
            desc: 'उच्च दर्जाचे मोती, मणी आणि नक्षीकाम जे त्वचेला त्रास देणार नाही आणि पिढ्यानपिढ्या टिकून राहील.'
          }
        ],
        founderNoteTitle: "फाउंडरचे मनोगत (Founder's Note)",
        founderQuote:
          '"माझ्या या छोट्याशा स्वप्नावर विश्वास ठेवल्याबद्दल, हाताने बनवलेल्या दागिन्यांची कदर केल्याबद्दल आणि तुमच्या गोड नखऱ्यांनी या प्रवासात रंग भरल्याबद्दल मनापासून आभार!"',
        signRole: 'फाउंडर आणि डिझायनर, नथशिखा (पूर्वीची नखरेवाली)',
        ctaHeading: 'आपल्या नखऱ्याला द्या दागिन्यांचा साज ✨',
        ctaSubtitle:
          'पारंपारिक आणि आकर्षक हाताने घडवलेल्या दागिन्यांची आमची संपूर्ण श्रेणी आताच एक्सप्लोर करा.',
        ctaShopBtn: 'दागिने एक्सप्लोर करा (Shop Now)',
        ctaWhatsappBtn: 'व्हाट्सॲपवर संपर्क करा',
        ctaInstagramBtn: 'इन्स्टाग्राम (@nakharewali.handmade)',
        ctaFacebookBtn: 'फेसबुक (Nakharewali.handmade)',
        whatsappGreeting: 'नमस्कार श्वेता! मी नथशिखा बद्दल जाणून घेत आहे आणि मला दागिन्यांची ऑर्डर करायची आहे.'
      }
    : {
        heroBadge: "Welcome to 'Nathshikha' (Formerly Nakhrewali)",
        heroTitleLine1: 'Same Charm, Same Love... ',
        heroTitleLine2: 'Just a New Name!',
        heroSubtitle:
          'Celebrating the sweet charm, graceful poise, and signature style of every woman... with authentic handcrafted Maharashtrian jewellery made just for you!',
        stats: [
          { num: '500+', label: 'Happy Families' },
          { num: '100%', label: 'Handcrafted Heirlooms' },
          { num: '2024', label: 'Journey Began' },
          { num: '5★', label: 'Love & Trust' }
        ],
        founderName: 'Shweta Darekar',
        founderRole: 'Founder & Designer, Nathshikha',
        craftStamp: 'Authentic Maharashtrian Craft',
        chapter1Eyebrow: 'Chapter 1: The Spark of an Idea',
        chapter1Heading: '"Can we build something of our own?"',
        chapter1P1:
          'Having completed my MCA, I was working as a UI/UX Designer. On paper, everything looked comfortable and settled. But deep within, one thought kept echoing—',
        chapter1P1Bold:
          'I wanted to build something on my own strength, and become my own boss!',
        chapter1P2:
          'To be completely honest, this journey was not easy. Some ideas did not work out, some attempts faced hurdles. But every experience taught me one invaluable lesson—',
        chapter1P2Bold:
          'when you create something straight from the heart with your own hands, true magic happens.',
        chapter2Eyebrow: "Chapter 2: The Journey of 'Nakhrewali' (2024)",
        chapter2Heading:
          'From "Will this really work?" to 500+ Happy Customers!',
        chapter2P1Pre: 'In 2024, without any prior jewellery-making background, fueled only by sheer determination and a small Instagram page, ',
        chapter2P1Bold: "'Nakhrewali' was born.",
        chapter2P2Pre: 'The idea behind it was simple: ',
        chapter2P2Quote: "'Nakhra'",
        chapter2P2Post:
          ' is not vanity—it is a woman’s self-confidence and natural beauty! I wanted to handcraft jewellery that perfectly celebrated this radiant charm.',
        chapter2P3Pre: 'What started as a ',
        chapter2P3SideHustle: 'side hustle',
        chapter2P3Post:
          ' turned into an exhilarating roller-coaster ride. Working late into the night, learning intricate handcrafted designs, and connecting with thousands of wonderful women... in no time, ',
        chapter2P3Bold: '1 order grew into over 500 orders.',
        evolutionEyebrow: '✦ Brand Evolution ✦',
        evolutionHeading: "'Nakhrewali' to 'Nathshikha' : Why a new name?",
        evolutionLead: (
          <>
            As our family expanded, our dreams grew bigger. From the allure of the traditional Nath to the pinnacle (Shikha) of royal ornamentation... that is <b>'Nathshikha'</b>! We wanted a name that honors a woman's complete beauty from head to toe, and thus we chose <b>'Nathshikha'</b>.
          </>
        ),
        promises: [
          {
            icon: Heart,
            title: 'Same Love',
            desc: 'The hands crafting each jewel are the same, and the warmth and love behind every piece remains unchanged.'
          },
          {
            icon: Award,
            title: 'Same Premium Quality',
            desc: 'Our 100% assurance of authentic artisanal craftsmanship and long-lasting golden luster.'
          },
          {
            icon: Sparkles,
            title: 'Just a Beautiful New Name',
            desc: 'We have given a rich, elevated, and beautiful new identity to our beloved journey and growing community.'
          }
        ],
        valuesEyebrow: '✦ Our Values ✦',
        valuesHeading: 'Our Core Values',
        valuesLead:
          'In every jewel we craft and deliver to your doorstep, we faithfully uphold these four cornerstone values:',
        valuesList: [
          {
            num: '01',
            icon: Palette,
            title: 'Handcrafted with Heart',
            sub: 'Handcrafted with Heart',
            desc: 'Never mass-produced on factory machines; every single jewel is lovingly and patiently handcrafted by hand.'
          },
          {
            num: '02',
            icon: Crown,
            title: 'Tradition Meets Modern Style',
            sub: 'Tradition Meets Modern Style',
            desc: 'Infusing timeless Maharashtrian heritage motifs with contemporary elegance for every generation.'
          },
          {
            num: '03',
            icon: Users,
            title: 'Customer First & Trust',
            sub: 'Customer First & Trust',
            desc: 'More than selling jewellery, our priority is cherishing every woman’s happiness, confidence, and trust.'
          },
          {
            num: '04',
            icon: Gem,
            title: 'Pure Artisanal Quality',
            sub: 'Pure Artisanal Quality',
            desc: 'Hypoallergenic, skin-friendly pearls, beads, and artisanal metalwork crafted to last for generations.'
          }
        ],
        founderNoteTitle: "Founder's Note",
        founderQuote:
          '"Thank you from the bottom of my heart for believing in this little dream, cherishing handmade jewellery, and filling this journey with your radiant grace!"',
        signRole: 'Founder & Designer, Nathshikha (Formerly Nakhrewali)',
        ctaHeading: 'Adorn Your Grace with Handcrafted Heirlooms ✨',
        ctaSubtitle:
          'Explore our complete collection of traditional and contemporary handcrafted Maharashtrian jewellery.',
        ctaShopBtn: 'Explore Collection (Shop Now)',
        ctaWhatsappBtn: 'Chat on WhatsApp',
        ctaInstagramBtn: 'Instagram: @nakharewali.handmade',
        ctaFacebookBtn: 'Facebook: Nakharewali.handmade',
        whatsappGreeting: 'Hello Shweta! I was reading about Nathshikha on your website and would love to enquire about jewellery orders.'
      };

  return (
    <main className="page aboutPage">
      {/* 1. Hero Section */}
      <section className="aboutHeroSection">
        <div className="aboutHeroContainer">
          <div className="aboutHeroBadge">
            <Sparkles size={14} />
            <span>{content.heroBadge}</span>
            <Sparkles size={14} />
          </div>

          <h1 className="aboutHeroTitle">
            {content.heroTitleLine1} <br />
            <span className="goldGradientText">{content.heroTitleLine2}</span>
          </h1>

          <p className="aboutHeroSubtitle">{content.heroSubtitle}</p>

          {/* Floating Impact Stats Strip */}
          <div className="aboutStatsStrip">
            {content.stats.map((stat, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <div className="statDivider"></div>}
                <div className="aboutStatCard">
                  <span className="statNum">{stat.num}</span>
                  <span className="statLabel">{stat.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Main Story & Founder Section */}
      <section className="aboutStorySection">
        <div className="aboutStoryContainer">
          {/* Left Column: Founder Photo */}
          <div className="founderPhotoCol">
            <div className="founderPhotoCard">
              <div className="ornamentalFrameWrapper">
                <img
                  src="/assets/founder-shweta.jpg"
                  alt={`${content.founderName} - ${content.founderRole}`}
                  className="founderImg"
                />
                <div className="photoOverlayGradient"></div>
              </div>

              {/* Floating Founder Badge */}
              <div className="founderMetaBadge">
                <div className="founderBadgeIcon">
                  <Crown size={18} />
                </div>
                <div>
                  <h4 className="founderName">{content.founderName}</h4>
                  <p className="founderRole">{content.founderRole}</p>
                </div>
              </div>

              <div className="traditionalCraftStamp">
                <Sparkles size={13} />
                <span>{content.craftStamp}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Unified Story Card Containing Both Chapters */}
          <div className="storyTextCol">
            <div className="storyCard singleStoryCard">
              {/* Chapter 1: The Spark */}
              <div className="storyChapterBlock">
                <div className="storySectionEyebrow">
                  <Feather size={14} />
                  <span>{content.chapter1Eyebrow}</span>
                </div>
                <h2 className="storyHeading">{content.chapter1Heading}</h2>
                <div className="storyParagraphs">
                  <p>
                    {content.chapter1P1}
                    <b>{content.chapter1P1Bold}</b>
                  </p>
                  <p>
                    {content.chapter1P2}
                    <b>{content.chapter1P2Bold}</b>
                  </p>
                </div>
              </div>

              {/* Decorative Chapter Divider */}
              <div className="chapterDivider">
                <div className="chapterDividerLine"></div>
                <div className="chapterDividerEmblem">
                  <Sparkles size={14} />
                </div>
                <div className="chapterDividerLine"></div>
              </div>

              {/* Chapter 2: Nakhrewali Journey */}
              <div className="storyChapterBlock">
                <div className="storySectionEyebrow">
                  <Sparkles size={14} />
                  <span>{content.chapter2Eyebrow}</span>
                </div>
                <h2 className="storyHeading">{content.chapter2Heading}</h2>
                <div className="storyParagraphs">
                  <p>
                    {content.chapter2P1Pre}
                    <b>{content.chapter2P1Bold}</b>
                  </p>
                  <p>
                    {content.chapter2P2Pre}
                    <em>{content.chapter2P2Quote}</em>
                    {content.chapter2P2Post}
                  </p>
                  <p>
                    {content.chapter2P3Pre}
                    <b>{content.chapter2P3SideHustle}</b>
                    {content.chapter2P3Post}
                    <b>{content.chapter2P3Bold}</b>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Evolution Section ('नखरेवाली' ते 'नथशिखा') */}
      <section className="aboutEvolutionSection">
        <div className="evolutionContainer">
          <div className="evolutionHeader">
            <span className="eyebrowText">{content.evolutionEyebrow}</span>
            <h2>{content.evolutionHeading}</h2>
            <p className="evolutionLeadText">{content.evolutionLead}</p>
          </div>

          <div className="evolutionCardsGrid">
            {content.promises.map((promise, idx) => {
              const IconComp = promise.icon;
              return (
                <div key={idx} className="evolutionPromiseCard">
                  <div className="promiseIconWrap">
                    <IconComp size={24} />
                  </div>
                  <h3>{promise.title}</h3>
                  <p>{promise.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Values Section */}
      <section className="aboutValuesSection">
        <div className="valuesContainer">
          <div className="valuesHeader">
            <span className="eyebrowText">{content.valuesEyebrow}</span>
            <h2>{content.valuesHeading}</h2>
            <p>{content.valuesLead}</p>
          </div>

          <div className="valuesGrid">
            {content.valuesList.map((val, idx) => {
              const IconComp = val.icon;
              return (
                <div key={idx} className="valueCard">
                  <div className="valueNumber">{val.num}</div>
                  <div className="valueIcon">
                    <IconComp size={22} />
                  </div>
                  <h3>{val.title}</h3>
                  <span className="valueSub">{val.sub}</span>
                  <p>{val.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Founder Note Section */}
      <section className="aboutFounderNoteSection">
        <div className="founderNoteContainer">
          <div className="quoteIconDecoration">
            <Quote size={48} />
          </div>

          <h3 className="founderNoteTitle">{content.founderNoteTitle}</h3>

          <blockquote className="founderQuoteText">{content.founderQuote}</blockquote>

          <div className="founderSignWrapper">
            <div className="founderSignLine"></div>
            <div className="founderSignInfo">
              <b className="signName">{content.founderName}</b>
              <span className="signTitle">{content.signRole}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Call to Action Banner */}
      <section className="aboutCtaSection">
        <div className="aboutCtaContainer">
          <div className="aboutCtaContent">
            <h2>{content.ctaHeading}</h2>
            <p>{content.ctaSubtitle}</p>
          </div>

          <div className="aboutCtaActions">
            <Link to="/shop" className="goldBtn aboutCtaMainBtn">
              <Store size={16} />
              <span>{content.ctaShopBtn}</span>
            </Link>

            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(content.whatsappGreeting)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="outlineBtn aboutWhatsappBtn"
            >
              <MessageSquare size={16} />
              <span>{content.ctaWhatsappBtn}</span>
            </a>

            <a
              href="https://www.instagram.com/nakharewali.handmade"
              target="_blank"
              rel="noopener noreferrer"
              className="outlineBtn aboutInstagramBtn"
            >
              <Instagram size={16} />
              <span>{content.ctaInstagramBtn}</span>
            </a>

            <a
              href="https://www.facebook.com/Nakharewali.handmade"
              target="_blank"
              rel="noopener noreferrer"
              className="outlineBtn aboutFacebookBtn"
            >
              <Facebook size={16} />
              <span>{content.ctaFacebookBtn}</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
