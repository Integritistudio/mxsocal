require('dotenv').config();
const db = require('../config/database'); db.options.logging = false;
const Story = require('../models/story.model');
const { cleanDocument } = require('../lib/story-content');
const paragraph = text => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const heading = text => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] });
const entries = [
  { title: 'Your first track day: start with a plan, not a lap time', slug: 'your-first-motocross-track-day', category: 'Riding Guides', image: 'edd38.png', alt: 'Motocross rider cornering on a dirt track', excerpt: 'A good first day is about getting comfortable. Here is how to prepare, ask the right questions, and leave wanting another session.', sections: [
    ['Before you load the bike', 'Start with the basics: confirm the venue’s requirements, check the weather, and make sure your bike is suitable for the session. Ask about beginner sessions and any required briefings. Pack your riding equipment, water, and the items recommended by your bike’s manual. Give yourself time to arrive without rushing.'],
    ['Make the first session a learning session', 'Talk to the venue team about how the track operates before riding. Learn the entry and exit points, the flags, and the rules for your session. Work with a qualified coach on a pace and practice area that suit your experience. You do not need a fast lap to have a productive day.'],
    ['Finish with one thing to work on', 'After the session, write down what felt comfortable and what you want help with next time. That might be a question about position, a section you want to understand, or a piece of equipment that needs attention. Small, repeatable improvements give the next visit a clear purpose.'],
  ] },
  { title: 'A better post-ride routine starts before the bike goes away', slug: 'post-ride-bike-care-routine', category: 'Bike Care', image: '54bae.png', alt: 'Close-up of a dirt bike tire', excerpt: 'Set aside a little time after the ride to inspect, clean, and note what needs attention before your next outing.', sections: [
    ['Look before you clean', 'Take a moment to inspect the bike before washing away the day. Note any damage, leaks, loose parts, or changes you noticed while riding. Your owner’s manual is the reference for the correct inspection and service procedures. Anything you are unsure about belongs on a qualified technician’s list.'],
    ['Follow the bike’s cleaning guidance', 'Use cleaning products and methods appropriate for the bike and its components. Follow the manufacturer’s advice about cooling, water pressure, and protected areas. A clean bike is easier to inspect, but cleaning is not a substitute for the scheduled maintenance in the manual.'],
    ['Keep a simple ride log', 'Record ride time, the conditions, and anything that changed. Keep service records together so you can see what was done and what is due. Before the next outing, revisit the notes instead of relying on memory. It is a simple habit that makes preparation more organized.'],
  ] },
  { title: 'Choosing a dirt bike: ask these questions first', slug: 'choosing-a-dirt-bike', category: 'Riding Guides', image: '59326.png', alt: 'Dirt bike and rider at an outdoor riding area', excerpt: 'The right conversation starts with your experience and where you want to ride—not just engine size or a spec sheet.', sections: [
    ['Be specific about the riding', 'A track session and a trail outing can ask different things of a rider and a bike. Describe the places you expect to ride, the length of your sessions, and the rules that apply there. That context helps a coach or dealer narrow down suitable options.'],
    ['Talk honestly about experience', 'Share what you have ridden before and what still feels unfamiliar. Ask for help assessing fit, controls, and how the bike responds. A qualified coach can help you understand the choices without turning the decision into a comparison with another rider.'],
    ['Think beyond the first ride', 'Ask about the maintenance schedule, equipment, transport, and support you will need. Follow the manufacturer’s guidance for the specific model. If you are comparing bikes, keep notes on those practical questions as well as the specification list.'],
  ] },
  { title: 'What to bring to a coaching session', slug: 'prepare-for-a-coaching-session', category: 'Riding Guides', image: '357e3.png', alt: 'Rider practicing on a dirt-track corner', excerpt: 'A short conversation before the session helps your coach plan around your experience, equipment, and goals.', sections: [
    ['Send the useful details ahead', 'Tell your coach what you ride, where you have ridden, and what you hope to work on. Ask what equipment is required and whether there are any checks or forms to complete. Confirm the location and meeting time so the session can start with fewer loose ends.'],
    ['Choose a clear goal', 'You do not need a long list. Describe one situation that you want to understand better and let the coach assess where to begin. Keep the goal flexible: the most useful starting point may be a foundation you had not thought about.'],
    ['Take the lesson home', 'Ask what to practice, where that practice is appropriate, and how to tell when you are ready for the next step. Make a brief note while the conversation is fresh. Follow the coach’s plan instead of adding harder drills on your own.'],
  ] },
  { title: 'A gear check that belongs on every ride-day list', slug: 'ride-day-gear-check', category: 'Gear', image: '26411.png', alt: 'Motocross rider wearing protective riding equipment', excerpt: 'Give your equipment its own place in your preparation. Check condition, fit, and the guidance that came with it.', sections: [
    ['Check the requirements first', 'Confirm what the venue or event requires for the session you booked. Match that list against your equipment before packing. If a requirement is unclear, ask the organizer rather than assuming the same rules apply everywhere.'],
    ['Look at condition and fit', 'Inspect your equipment using the manufacturer’s care and replacement guidance. Pay attention to items that have been damaged or no longer fit correctly. A qualified retailer can help with fit questions, while the manufacturer is the reference for product-specific advice.'],
    ['Keep the checklist practical', 'Use a packing list you can repeat. Put the small items in the same place, and allow time to replace anything that is missing before ride day. Preparation is easier when you do not have to rebuild the list from memory each time.'],
  ] },
  { title: 'Finding your rhythm between riding sessions', slug: 'finding-your-riding-rhythm', category: 'Rider Stories', image: '2924d.png', alt: 'Off-road rider on a dirt bike', excerpt: 'Progress can be quieter than a faster lap. A few notes after each session can help you see what is changing.', sections: [
    ['Notice more than the result', 'After a ride, note the parts that felt more familiar and the questions that remain. A session does not have to end with a big milestone to be useful. Clear observations give you something concrete to discuss with a coach.'],
    ['Keep the next step small', 'Choose a focus that fits the guidance you have been given and the place you are riding. Avoid measuring your plan against someone else’s session. Experience, equipment, and conditions can differ even when two riders are on the same track.'],
    ['Leave room to enjoy the day', 'Riding has its own practical rhythm: preparing, learning, taking breaks, and looking after equipment. Making space for those parts can make the whole day feel more organized. Keep your notes simple enough that you will actually use them again.'],
  ] },
  { title: 'Plan the ride before you pack the van', slug: 'planning-your-next-ride-day', category: 'Riding Guides', image: 'edd38.png', alt: 'Rider turning through a dirt-track berm', excerpt: 'Venue details, equipment, transport, and a realistic plan make a useful starting point for your next ride day.', sections: [
    ['Confirm the details', 'Check the venue’s opening times, booking process, riding requirements, and current notices. Ask about anything that affects your session, including conditions and suitable riding areas. Keep the contact details somewhere easy to find.'],
    ['Make a packing plan', 'Work through your equipment and transport checklist early enough to deal with anything missing. Use the bike’s manual for checks and service requirements. If you are renting a bike, confirm what is included and what you need to bring.'],
    ['Set a realistic focus', 'Decide what you want from the session and discuss it with your coach or riding group where appropriate. Leave time for the briefing and preparation. A clear plan makes it easier to adjust when the day does not run exactly as expected.'],
  ] },
];
(async () => {
  try {
    await Story.sync();
    let created = 0;
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const content = cleanDocument({ type: 'doc', content: [paragraph(entry.excerpt), ...entry.sections.flatMap(([title, text]) => [heading(title), paragraph(text)])] });
      const [, inserted] = await Story.findOrCreate({ where: { slug: entry.slug }, defaults: { title: entry.title, excerpt: entry.excerpt, category: entry.category, author: 'MXSoCal Editorial', coverImage: `/images/about/${entry.image}`, coverAlt: entry.alt, content, status: 'published', featured: index === 0, publishedAt: new Date(Date.now() - index * 86400000), seoDescription: entry.excerpt.slice(0, 170) } });
      if (inserted) created++;
    }
    console.log(`Stories ready: ${created} created; existing stories preserved.`);
  } finally { await db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
