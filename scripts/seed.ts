// Wipes content collections and inserts demo data. Users are left alone.
// Run: npm run seed
import mongoose from "mongoose";
import { db } from "../lib/db";
import { Collection, Landing, Location, Project, ProjectPage, Settings, Testimonial, Type } from "../lib/models";

// ponytail: demo images are absolute placeholder URLs; real uploads store Cloudinary paths (see lib/media.ts)
const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/600`;

async function main() {
  await db();
  await Promise.all([Project, Location, Type, Testimonial, Collection, ProjectPage, Settings, Landing].map((M) => (M as typeof Project).deleteMany({})));

  const [residential, commercial] = await Type.insertMany([
    { slug: "residential", name: { en: "Residential", hi: "आवासीय" }, order: 1 },
    { slug: "commercial", name: { en: "Commercial", hi: "व्यावसायिक" }, order: 2 },
  ]);
  const [apartment, villa, plot, office, shop] = await Type.insertMany([
    { slug: "apartment", name: { en: "Apartment", hi: "अपार्टमेंट" }, parent: residential._id, order: 1 },
    { slug: "villa", name: { en: "Villa", hi: "विला" }, parent: residential._id, order: 2 },
    { slug: "plot", name: { en: "Plot", hi: "प्लॉट" }, parent: residential._id, order: 3 },
    { slug: "office", name: { en: "Office", hi: "ऑफिस" }, parent: commercial._id, order: 1 },
    { slug: "shop", name: { en: "Shop", hi: "दुकान" }, parent: commercial._id, order: 2 },
  ]);

  const [jaipur, udaipur, ajmer] = await Location.insertMany([
    { slug: "jaipur", name: { en: "Jaipur", hi: "जयपुर" }, image: img("jaipur"), order: 1, seoIntro: { en: "Homes and offices across Jaipur.", hi: "जयपुर में घर और ऑफिस।" } },
    { slug: "udaipur", name: { en: "Udaipur", hi: "उदयपुर" }, image: img("udaipur"), order: 2 },
    { slug: "ajmer", name: { en: "Ajmer", hi: "अजमेर" }, image: img("ajmer"), order: 3 },
  ]);

  const base = (slug: string, en: string, hi: string) => ({
    slug,
    name: { en, hi },
    shortDesc: { en: `${en} — thoughtfully planned living.`, hi: `${hi} — सोच-समझकर बनाया गया घर।` },
    description: { en: `${en} offers spacious homes with modern amenities.`, hi: `${hi} में आधुनिक सुविधाओं के साथ बड़े घर।` },
    images: [1, 2, 3].map((i) => ({ url: img(`${slug}-${i}`), alt: { en: `${en} photo ${i}`, hi: `${hi} फोटो ${i}` } })),
    amenities: [
      { en: "Clubhouse", hi: "क्लबहाउस" },
      { en: "Swimming pool", hi: "स्विमिंग पूल" },
      { en: "24×7 security", hi: "24×7 सुरक्षा" },
    ],
    highlights: [{ en: "Near ring road", hi: "रिंग रोड के पास" }],
    nearby: [{ name: { en: "City Hospital", hi: "सिटी अस्पताल" }, distance: "2 km" }],
    videos: [{ title: { en: "Walkthrough", hi: "वॉकथ्रू" }, youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }],
    status: "published",
  });

  const projects = await Project.insertMany([
    {
      ...base("madhuram-heights", "Madhuram Heights", "मधुरम हाइट्स"),
      location: jaipur._id, locality: { en: "Vaishali Nagar", hi: "वैशाली नगर" }, types: [residential._id, apartment._id],
      badge: { en: "Under construction", hi: "निर्माणाधीन" },
      configs: [
        { bhk: 2, label: { en: "2 BHK", hi: "2 बीएचके" }, sizeSqft: 1150 },
        { bhk: 3, label: { en: "3 BHK", hi: "3 बीएचके" }, sizeSqft: 1580 },
      ],
      facts: [
        { label: { en: "Config", hi: "कॉन्फ़िग" }, value: { en: "2, 3 BHK", hi: "2, 3 बीएचके" }, onCard: true },
        { label: { en: "Possession", hi: "पज़ेशन" }, value: { en: "Dec 2027", hi: "दिसं 2027" }, onCard: true },
        { label: { en: "RERA", hi: "रेरा" }, value: { en: "RAJ/P/2025/1234" } },
      ],
      priceMin: 4500000, priceMax: 9000000, geo: { lat: 26.9124, lng: 75.7873 },
    },
    {
      ...base("madhuram-villas", "Madhuram Villas", "मधुरम विला"),
      location: jaipur._id, locality: { en: "Jagatpura", hi: "जगतपुरा" }, types: [residential._id, villa._id],
      badge: { en: "Ready to move", hi: "रेडी टू मूव" },
      configs: [{ bhk: 4, label: { en: "4 BHK Villa", hi: "4 बीएचके विला" }, sizeSqft: 2800 }],
      facts: [{ label: { en: "Config", hi: "कॉन्फ़िग" }, value: { en: "4 BHK", hi: "4 बीएचके" }, onCard: true }],
      priceMin: 15000000, priceMax: 22000000,
    },
    {
      ...base("lake-view-plots", "Lake View Plots", "लेक व्यू प्लॉट्स"),
      location: udaipur._id, locality: { en: "Fateh Sagar", hi: "फतेह सागर" }, types: [residential._id, plot._id],
      badge: { en: "New launch", hi: "नया लॉन्च" },
      facts: [{ label: { en: "Plot size", hi: "प्लॉट साइज़" }, value: { en: "150–300 sq yd", hi: "150–300 वर्ग गज" }, onCard: true }],
      priceMin: 3000000, priceMax: 7000000,
    },
    {
      ...base("madhuram-business-park", "Madhuram Business Park", "मधुरम बिज़नेस पार्क"),
      location: ajmer._id, locality: { en: "Vaishali Nagar", hi: "वैशाली नगर" }, types: [commercial._id, office._id, shop._id],
      facts: [{ label: { en: "Units", hi: "यूनिट्स" }, value: { en: "Offices & shops", hi: "ऑफिस और दुकानें" }, onCard: true }],
      priceMin: 2500000, priceMax: 12000000,
    },
  ]);

  const top = await Collection.create({ name: "Top projects", projects: projects.map((p) => p._id) });

  await ProjectPage.create({
    sections: [
      ["overview", "Overview", "विवरण"],
      ["floorPlans", "Floor plans", "फ्लोर प्लान"],
      ["videos", "Videos", "वीडियो"],
      ["documents", "Downloads", "डाउनलोड"],
      ["amenities", "Amenities", "सुविधाएं"],
      ["location", "Location", "लोकेशन"],
      ["similar", "Similar projects", "मिलते-जुलते प्रोजेक्ट्स"],
    ].map(([key, en, hi]) => ({ key, title: { en, hi }, visible: true })),
    defaultFacts: [{ label: { en: "Config", hi: "कॉन्फ़िग" } }, { label: { en: "Possession", hi: "पज़ेशन" } }],
    similar: top._id,
  });

  await Settings.create({
    whatsappNumber: "919999999999",
    phone: "+91 99999 99999",
    email: "hello@example.com",
    address: { en: "Office 1, Tonk Road, Jaipur", hi: "ऑफिस 1, टोंक रोड, जयपुर" },
    geo: { lat: 26.85, lng: 75.8 },
    hours: { en: "Mon–Sat, 10am–7pm", hi: "सोम–शनि, सुबह 10–शाम 7" },
    socials: { instagram: "https://instagram.com/" },
    priceMsg: { en: "Hi, please share the price for {project} ({config}) in {location}. {link}", hi: "नमस्ते, {location} में {project} ({config}) की कीमत बताएं। {link}" },
    enquiryMsg: { en: "Hi, I'd like to know more about your projects.", hi: "नमस्ते, मुझे आपके प्रोजेक्ट्स के बारे में जानना है।" },
    defaultSeo: { title: { en: "Madhuram — Homes in Rajasthan", hi: "मधुरम — राजस्थान में घर" }, description: { en: "Apartments, villas and plots.", hi: "अपार्टमेंट, विला और प्लॉट।" } },
  });

  const sections = [
    {
      key: "trust",
      title: { en: "25 years of trust", hi: "25 साल का भरोसा" },
      subtitle: { en: "5,000+ happy families", hi: "5,000+ खुश परिवार" },
      items: [1, 2, 3].map((i) => ({ image: img(`trust-${i}`), alt: { en: `Site ${i}` }, link: "/en/projects" })),
      stats: [
        { value: "25+", label: { en: "Years", hi: "साल" } },
        { value: "40+", label: { en: "Projects", hi: "प्रोजेक्ट्स" } },
        { value: "5,000+", label: { en: "Families", hi: "परिवार" } },
      ],
    },
    { key: "about", title: { en: "Find your home with Madhuram", hi: "मधुरम के साथ अपना घर खोजें" }, subtitle: { en: "Trusted homes across Rajasthan.", hi: "राजस्थान भर में भरोसेमंद घर।" } },
    { key: "locations", title: { en: "Projects by location", hi: "स्थान के अनुसार प्रोजेक्ट्स" }, variant: "circles" },
    { key: "topProjects", title: { en: "Top projects", hi: "टॉप प्रोजेक्ट्स" }, collectionId: top._id },
    { key: "types", title: { en: "Projects by type", hi: "प्रकार के अनुसार प्रोजेक्ट्स" } },
    { key: "testimonials", title: { en: "What our buyers say", hi: "हमारे ग्राहक क्या कहते हैं" } },
    { key: "contact", title: { en: "Contact us", hi: "संपर्क करें" } },
  ].map((s) => ({ visible: true, ...s }));
  await Landing.create({ draft: { sections }, live: { sections }, publishedAt: new Date(), publishedBy: "seed" });

  await Testimonial.insertMany([
    { name: "Ravi Sharma", text: { en: "Smooth buying process and on-time possession.", hi: "आसान खरीद प्रक्रिया और समय पर पज़ेशन।" }, project: projects[0]._id, rating: 5, order: 1 },
    { name: "Anita Jain", text: { en: "Great quality construction.", hi: "बेहतरीन निर्माण गुणवत्ता।" }, project: projects[1]._id, rating: 5, order: 2 },
  ]);

  console.log(`Seeded ${projects.length} projects, 3 locations, 7 types.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
