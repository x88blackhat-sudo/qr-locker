/**
 * Real academic content for the Algerian 3AS science stream (شعبة علوم تجريبية).
 * This is shared curriculum data — never student progress. IDs are stable so the
 * seed is fully idempotent (INSERT OR IGNORE) and safe to run on every boot.
 */

export interface SeedCard {
  front: string;
  back: string;
  hint?: string;
}

export interface SeedExercise {
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  minutes: number;
}

export interface SeedUnit {
  id: string;
  title: string;
  description: string;
  exercises: SeedExercise[];
  cards: SeedCard[];
}

export interface SeedSeries {
  title: string;
  description: string;
  items: number;
  minutes: number;
  unitId?: string;
}

export interface SeedSubject {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  icon: string;
  coefficient: number;
  durationMinutes: number;
  topics: string[];
  units: SeedUnit[];
  series: SeedSeries[];
}

const ex = (title: string, difficulty: SeedExercise['difficulty'], minutes: number): SeedExercise => ({
  title,
  difficulty,
  minutes,
});

export const SEED_SUBJECTS: SeedSubject[] = [
  {
    id: 'math',
    slug: 'math',
    name: 'الرياضيات',
    shortName: 'رياضيات',
    description:
      'الدوال، المتتاليات، الأعداد المركبة والاحتمالات: أساس شعبة العلوم التجريبية وأعلى معامل في البكالوريا.',
    color: '#2F5BEA',
    icon: 'sigma',
    coefficient: 7,
    durationMinutes: 180,
    topics: ['الدوال العددية', 'المتتاليات العددية', 'الأعداد المركبة', 'الاحتمالات'],
    units: [
      {
        id: 'math-u1',
        title: 'الدوال العددية',
        description: 'النهايات، الاستمرارية، الاشتقاق ودراسة اتجاه التغير مع التمثيل البياني.',
        exercises: [
          ex('دراسة دالة كسرية مع إنشاء جدول التغيرات', 'medium', 35),
          ex('النهايات والاشتقاق — تمارين تطبيقية', 'easy', 20),
        ],
        cards: [
          {
            front: 'ما هو شرط تعريف الدالة اللوغاريتمية ln(x)؟',
            back: 'x > 0، أي أن مجالها هو ]0, +∞[، لأن اللوغاريتم معرّف فقط على الأعداد الموجبة تمامًا.',
            hint: 'تذكّر مجال الأسية واللوغاريتم',
          },
          {
            front: 'ما هي مشتقة الدالة المركبة ln(u(x))؟',
            back: 'u′(x) / u(x)، بشرط أن تكون u(x) موجبة تمامًا على مجال الدراسة.',
          },
          {
            front: 'ما هي نظرية القيم المتوسطة؟',
            back: 'إذا كانت f مستمرة على [a, b] وكان f(a) × f(b) ≤ 0، فإن المعادلة f(x) = 0 تقبل على الأقل حلًّا في [a, b].',
          },
        ],
      },
      {
        id: 'math-u2',
        title: 'المتتاليات العددية',
        description: 'المتتاليات الحسابية والهندسية، حدودها، مجاميعها وتقاربها.',
        exercises: [
          ex('متتالية هندسية — حساب الحد العام والمجموع', 'medium', 30),
          ex('دراسة تقارب متتالية وبرهان بالتراجع', 'hard', 40),
        ],
        cards: [
          {
            front: 'متى تكون المتتالية (uₙ) هندسية؟',
            back: 'إذا وُجد عدد ثابت q بحيث uₙ₊₁ = q × uₙ لكل n، ويسمى q أساس المتتالية.',
          },
          {
            front: 'إلى ماذا تؤول qⁿ عندما |q| < 1؟',
            back: 'تؤول إلى الصفر، ومنه مجموع المتتالية الهندسية يتقارب إلى u₀ / (1 − q).',
          },
          {
            front: 'ما هي صيغة الحد العام للمتتالية الحسابية؟',
            back: 'uₙ = u₀ + n·r، أو uₙ = u₁ + (n − 1)·r، حيث r هو الفرق الثابت.',
          },
        ],
      },
      {
        id: 'math-u3',
        title: 'الأعداد المركبة',
        description: 'الشكل الجبري، المثلثي والأسي، حلول المعادلات والتحويلات النقطية.',
        exercises: [
          ex('تحويل عدد مركب إلى الشكل المثلثي', 'easy', 20),
          ex('معادلة من الدرجة الثانية في مجموعة الأعداد المركبة', 'medium', 25),
        ],
        cards: [
          {
            front: 'ما هي الصيغة الأسية للعدد المركب z = a + ib؟',
            back: 'z = r·e^{iθ} حيث r = √(a² + b²) هو الطويلة و θ = arg(z) هي اللوحة.',
          },
          {
            front: 'كيف نحدد طبيعة مثلث في المستوي المركب؟',
            back: 'بدراسة النسب (z − a)/(z − b): طويلة تساوي 1 تعني تناسقًا، ولوحة معينة تحدد الزوايا.',
          },
          {
            front: 'ما هي مرافق الأعداد z = a + ib؟',
            back: 'z̄ = a − ib، ومنه z·z̄ = a² + b² = |z|².',
          },
        ],
      },
      {
        id: 'math-u4',
        title: 'الاحتمالات',
        description: 'التجارب العشوائية، الاحتمال الشرطي، الاستقلالية والمتغير العشوائي.',
        exercises: [
          ex('شجرة الاحتمالات والاحتمال الشرطي', 'medium', 30),
          ex('المتغير العشوائي والأمل الرياضياتي', 'hard', 35),
        ],
        cards: [
          {
            front: 'ما هو احتمال الحدث المعاكس؟',
            back: 'P(Ā) = 1 − P(A)، وهو مفتاح حل الكثير من مسائل الاحتمالات.',
          },
          {
            front: 'ما هي صيغة الاحتمال الشرطي P(A|B)؟',
            back: 'P(A|B) = P(A ∩ B) / P(B)، بشرط P(B) ≠ 0.',
          },
          {
            front: 'ما هو الأمل الرياضياتي لمتغير عشوائي X؟',
            back: 'E(X) = Σ xᵢ·P(X = xᵢ)، ويقيس القيمة المتوسطة للنتائج.',
          },
        ],
      },
    ],
    series: [
      {
        title: 'سلسلة الدوال العددية — مراجعة شاملة',
        description: '20 تمرينًا متدرّجًا يغطي النهايات، الاشتقاق ودراسة الدوال كما ترد في امتحان البكالوريا.',
        items: 20,
        minutes: 240,
        unitId: 'math-u1',
      },
      {
        title: 'بكالوريا بيضاء — رياضيات',
        description: 'موضوع كامل على نمط البكالوريا مع سلم التنقيط وحل نموذجي.',
        items: 4,
        minutes: 180,
      },
    ],
  },
  {
    id: 'physics',
    slug: 'physics',
    name: 'الفيزياء',
    shortName: 'فيزياء',
    description:
      'الميكانيك، الكهرباء والتحولات النووية: مادة عالية المعامل تتطلب فهم القوانين وتحليل التجارب.',
    color: '#7A4AD6',
    icon: 'atom',
    coefficient: 6,
    durationMinutes: 180,
    topics: ['الميكانيك', 'الكهرباء', 'التحولات النووية', 'التذبذبات'],
    units: [
      {
        id: 'physics-u1',
        title: 'الميكانيك',
        description: 'قوانين نيوتن، العمل والطاقة، الحركات في المستوي.',
        exercises: [
          ex('قذيفة في مجال الثقالة — دراسة الحركة', 'medium', 35),
          ex('مبدأ انحفاظ الطاقة الميكانيكية', 'easy', 25),
        ],
        cards: [
          {
            front: 'ما هو نص القانون الثاني لنيوتن؟',
            back: 'ΣF = m × a، أي أن مجموع القوى الخارجية المؤثرة في جسم يساوي جداء كتلته في تسارعه.',
          },
          {
            front: 'ما هو عمل قوة ثابتة F خلال إزاحة d؟',
            back: 'W = F × d × cos α، حيث α هي الزاوية بين اتجاه القوة والإزاحة.',
          },
          {
            front: 'ما شرط توازن جسم صلب؟',
            back: 'مجموع القوى المؤثرة معدوم، ومجموع عزوم القوى بالنسبة إلى نقطة معدوم أيضًا.',
          },
        ],
      },
      {
        id: 'physics-u2',
        title: 'الكهرباء',
        description: 'الدارات الكهربائية، المكثفات والوشائع، والاهتزازات الكهربائية.',
        exercises: [
          ex('شحن مكثف ودراسة تطور التوتر', 'medium', 30),
          ex('دارة RL — المعادلة التفاضلية', 'hard', 40),
        ],
        cards: [
          {
            front: 'ما هو قانون أوم للدارات الأومية؟',
            back: 'U = R × I، حيث U التوتر بالفولط، R المقاومة بالأوم وI شدة التيار بالأمبير.',
          },
          {
            front: 'ما هي العلاقة بين التوتر وشدة التيار في وشيعة؟',
            back: 'u_L = L × (di/dt) + r·i، وفي حال وشيعة مثالية u_L = L·di/dt.',
          },
          {
            front: 'ما هي وحدة الطاقة في النظام الدولي؟',
            back: 'الجول (J). تُحسب الطاقة الكهربائية المخزنة في مكثف بالعلاقة E = ½·C·U².',
          },
        ],
      },
      {
        id: 'physics-u3',
        title: 'التحولات النووية',
        description: 'النشاط الإشعاعي، قانون التفكك، الطاقة النووية والتفاعلات.',
        exercises: [
          ex('قانون التفكك الإشعاعي وزمن نصف العمر', 'medium', 25),
          ex('طاقة الربط وحساب نقص الكتلة', 'hard', 30),
        ],
        cards: [
          {
            front: 'ما هو النشاط الإشعاعي؟',
            back: 'تحول تلقائي لأنوية غير مستقرة نحو أنوية أكثر استقرارًا مع إصدار إشعاعات (α، β، γ).',
          },
          {
            front: 'ما هو زمن نصف العمر T؟',
            back: 'المدة اللازمة لتفكك نصف عدد الأنوية الابتدائية؛ N(T) = N₀ / 2.',
          },
          {
            front: 'ما هي العلاقة بين الكتلة والطاقة؟',
            back: 'E = m·c²، وتُستعمل لحساب الطاقة المحرَّرة خلال التحولات النووية.',
          },
        ],
      },
    ],
    series: [
      {
        title: 'سلسلة الميكانيك — البكالوريا',
        description: 'تمارين مقترحة من مواضيع البكالوريا الوطنية حول الحركة والقوى والطاقة.',
        items: 15,
        minutes: 200,
        unitId: 'physics-u1',
      },
    ],
  },
  {
    id: 'svt',
    slug: 'svt',
    name: 'علوم الطبيعة والحياة',
    shortName: 'علوم',
    description:
      'الاستقلاب الطاقوي، المناعة والاتصال العصبي: مادة قائمة على التحليل الوثائقي والمنهجية العلمية.',
    color: '#178A63',
    icon: 'leaf',
    coefficient: 6,
    durationMinutes: 180,
    topics: ['الاستقلاب الطاقوي', 'المناعة', 'الاتصال العصبي', 'التنظيم الهرموني'],
    units: [
      {
        id: 'svt-u1',
        title: 'الاستقلاب الطاقوي',
        description: 'التركيب الضوئي، التنفس، وتنظيم السكر في الدم.',
        exercises: [
          ex('تحليل وثائق حول التنظيم الهرموني للسكر', 'medium', 30),
          ex('العلاقة بين البنية والوظيفة في الميتوكوندري', 'easy', 20),
        ],
        cards: [
          {
            front: 'ما هو دور الأنسولين؟',
            back: 'يهبط نسبة الغلوكوز في الدم عبر تحفيز دخول الغلوكوز إلى الخلايا وتخزينه على شكل غليكوجين.',
          },
          {
            front: 'ما هو دور الغلوكاغون؟',
            back: 'يرفع نسبة الغلوكوز في الدم عند انخفاضها عبر تحليل الغليكوجين الكبدي.',
          },
          {
            front: 'أين تتم المرحلة الكيميائية الضوئية للتركيب الضوئي؟',
            back: 'في أغشية التيلاكويد داخل الصانعات اليخضورية.',
          },
        ],
      },
      {
        id: 'svt-u2',
        title: 'المناعة',
        description: 'المناعة الطبيعية والمكتسبة، الاستجابة المناعية واللقاحات.',
        exercises: [
          ex('دراسة استجابة مناعية بتجارب على الفئران', 'hard', 35),
          ex('تحليل منحنى الاستجابة الأولية والثانوية', 'medium', 25),
        ],
        cards: [
          {
            front: 'ما هي الخلايا المفرزة للأجسام المضادة؟',
            back: 'الخلايا اللمفاوية البائية (LB) بعد تحولها إلى خلايا بلازمية.',
          },
          {
            front: 'ما هو دور الذاكرة المناعية؟',
            back: 'تسمح باستجابة سريعة وقوية عند التعرض الثاني لنفس المولد الضدي، وهو أساس مبدأ التلقيح.',
          },
          {
            front: 'ما الفرق بين المناعة الخلطية والخلوية؟',
            back: 'الخلطية تعتمد على الأجسام المضادة للخلايا LB، والخلوية على الخلايا اللمفاوية التائية LT.',
          },
        ],
      },
      {
        id: 'svt-u3',
        title: 'الاتصال العصبي',
        description: 'النورون، المشبك، الرسالة العصبية والإدماج.',
        exercises: [
          ex('تحليل نتائج تجارب على العصبون', 'medium', 30),
          ex('مقارنة الرسالة العصبية قبل وبعد المشبك', 'hard', 35),
        ],
        cards: [
          {
            front: 'ما هو دور النورون؟',
            back: 'استقبال الرسائل العصبية ونقلها وتكاملها ثم إيصالها إلى الأعضاء المنفذة.',
          },
          {
            front: 'ما هي طبيعة الرسالة العصبية على مستوى المشبك؟',
            back: 'كيميائية، بفضل الوسائط العصبية المُحرَّرة في الشق المشبكي.',
          },
          {
            front: 'ما هو دور غمد الميالين؟',
            back: 'يزيد سرعة انتشار كمون العمل على طول المحور العصبي.',
          },
        ],
      },
    ],
    series: [
      {
        title: 'حوليات المناعة — 12 موضوعًا',
        description: 'مواضيع بكالوريا مع حلول مفصّلة لاستراتيجية الإجابة على الأسئلة الوثائقية.',
        items: 12,
        minutes: 180,
        unitId: 'svt-u2',
      },
    ],
  },
  {
    id: 'arabic',
    slug: 'arabic',
    name: 'اللغة العربية وآدابها',
    shortName: 'عربية',
    description: 'تحليل النصوص الأدبية، البلاغة، القواعد والتعبير الكتابي وفق منهجية البكالوريا.',
    color: '#B07730',
    icon: 'pen',
    coefficient: 3,
    durationMinutes: 150,
    topics: ['النص الأدبي', 'البلاغة', 'القواعد', 'التعبير الكتابي'],
    units: [
      {
        id: 'arabic-u1',
        title: 'تحليل النص الأدبي',
        description: 'قراءة النص، تحديد نمطه، استخراج الأفكار والخصائص الفنية.',
        exercises: [
          ex('تحليل نص شعري — المستوى الدلالي والفني', 'medium', 45),
          ex('بناء نص حجاجي حول قضية أدبية', 'hard', 40),
        ],
        cards: [
          {
            front: 'ما هي خصائص النص الحجاجي؟',
            back: 'الأطروحة، الحجج، الأمثلة، النتيجة، واستعمال روابط الإقناع واللغة التقريرية.',
          },
          {
            front: 'ما هو السجع؟',
            back: 'توافق الكلمتين الأخيرتين في جملة أو فقرة في الحرف الأخير، وهو من المحسنات البديعية.',
          },
          {
            front: 'ما هي وظيفة الصورة البيانية؟',
            back: 'تقوية المعنى وتجسيده وجذب انتباه المتلقي، مع إثراء الدلالة.',
          },
        ],
      },
      {
        id: 'arabic-u2',
        title: 'القواعد والبلاغة',
        description: 'الإعراب، أدوات الشرط، التشبيه والاستعارة والكناية.',
        exercises: [
          ex('إعراب ودراسة جمل شرطية', 'medium', 25),
          ex('تمييز الاستعارة من الكناية في شواهد أدبية', 'easy', 20),
        ],
        cards: [
          {
            front: 'ما الفرق بين الاستعارة والكناية؟',
            back: 'في الاستعارة يُحذف أحد طرفي التشبيه، أما الكناية فتعبير يُراد به لازم معناه.',
          },
          {
            front: 'ما هي أدوات الشرط الجازمة؟',
            back: 'إنْ، من، ما، مهما، متى، أيّان، أين، حيثما... وتجزم فعلين مضارعين.',
          },
          {
            front: 'ما هو أسلوب التوكيد؟',
            back: 'تقوية المعنى وتقريره بالتكرار أو الحروف المؤكدة مثل إنّ وأنّ واللام.',
          },
        ],
      },
    ],
    series: [
      {
        title: 'مواضيع بكالوريا محلولة — عربية',
        description: '10 مواضيع كاملة مع عناصر الإجابة ومنهجية كتابة الموضوع.',
        items: 10,
        minutes: 150,
      },
    ],
  },
  {
    id: 'french',
    slug: 'french',
    name: 'اللغة الفرنسية',
    shortName: 'فرنسية',
    description: 'Compréhension de l’écrit, points de langue et production écrite selon le format du bac.',
    color: '#C0476E',
    icon: 'languages',
    coefficient: 2,
    durationMinutes: 150,
    topics: ['Compréhension de l’écrit', 'Points de langue', 'Production écrite'],
    units: [
      {
        id: 'french-u1',
        title: 'Compréhension et langue',
        description: 'Analyse de texte argumentatif, champ lexical et actes de parole.',
        exercises: [
          ex('Étude d’un texte argumentatif', 'medium', 40),
          ex('Exercices de transformation et de reformulation', 'easy', 20),
        ],
        cards: [
          {
            front: 'Quelles sont les caractéristiques du texte argumentatif ?',
            back: 'Une thèse, des arguments illustrés par des exemples et des connecteurs logiques.',
          },
          {
            front: 'Quel temps exprime une action en cours dans le passé ?',
            back: 'L’imparfait, tandis que le passé composé exprime une action achevée.',
          },
          {
            front: 'Comment exprimer l’hypothèse ?',
            back: 'Si + présent → futur simple ; si + imparfait → conditionnel présent.',
          },
        ],
      },
      {
        id: 'french-u2',
        title: 'Production écrite',
        description: 'Rédiger un texte argumentatif et un compte rendu objectif.',
        exercises: [
          ex('Rédiger une introduction argumentative', 'medium', 30),
          ex('Compte rendu objectif d’un texte', 'hard', 40),
        ],
        cards: [
          {
            front: 'Que signifie « le discours direct » ?',
            back: 'Les paroles sont rapportées telles quelles, entre guillemets, avec un verbe introducteur.',
          },
          {
            front: 'Quels connecteurs expriment l’opposition ?',
            back: 'Mais, cependant, toutefois, en revanche, néanmoins.',
          },
          {
            front: 'Quelle est la structure du compte rendu objectif ?',
            back: 'Une introduction (références du texte), le développement des idées essentielles, puis une conclusion.',
          },
        ],
      },
    ],
    series: [
      {
        title: 'Sujets de bac corrigés — Français',
        description: 'Six sujets complets avec corrigés types et barème indicatif.',
        items: 6,
        minutes: 120,
      },
    ],
  },
  {
    id: 'english',
    slug: 'english',
    name: 'اللغة الإنجليزية',
    shortName: 'إنجليزية',
    description: 'Reading, language points and writing for the national exam.',
    color: '#3E6FA8',
    icon: 'globe',
    coefficient: 2,
    durationMinutes: 135,
    topics: ['Reading comprehension', 'Language', 'Writing'],
    units: [
      {
        id: 'english-u1',
        title: 'Reading comprehension',
        description: 'Skimming, scanning and analysing a text’s structure.',
        exercises: [
          ex('True / false with justification', 'easy', 20),
          ex('Reference words and main idea questions', 'medium', 25),
        ],
        cards: [
          {
            front: 'When do we use “since” in present perfect?',
            back: 'With a point in time: “I have studied here since 2022.”',
          },
          {
            front: 'What is the past perfect form of “to study”?',
            back: 'had studied — used for an action completed before another past action.',
          },
          {
            front: 'Give three linking words for contrast.',
            back: 'However, although, whereas (also: nevertheless, on the other hand).',
          },
        ],
      },
      {
        id: 'english-u2',
        title: 'Writing',
        description: 'Paragraph and essay writing, opinion and argument.',
        exercises: [
          ex('Write a paragraph expressing an opinion', 'medium', 30),
          ex('Reported speech transformation drill', 'easy', 15),
        ],
        cards: [
          {
            front: 'What is reported speech for “I am tired”?',
            back: 'He said (that) he was tired — tense shifts one step back.',
          },
          {
            front: 'What makes a strong topic sentence?',
            back: 'It states the paragraph’s main idea clearly and connects to the essay’s thesis.',
          },
          {
            front: 'Give three expressions to introduce an argument.',
            back: 'First of all, moreover, finally / furthermore, in addition, lastly.',
          },
        ],
      },
    ],
    series: [
      {
        title: 'Past bac papers — English',
        description: 'A curated set of past exam texts with vocabulary support.',
        items: 8,
        minutes: 100,
      },
    ],
  },
  {
    id: 'philosophy',
    slug: 'philosophy',
    name: 'الفلسفة',
    shortName: 'فلسفة',
    description: 'بناء المقالة الفلسفية، طرح الإشكالية وتحليل الأطروحات المختلفة.',
    color: '#7B5A44',
    icon: 'brain',
    coefficient: 2,
    durationMinutes: 180,
    topics: ['المقالة الفلسفية', 'الإشكالية', 'الأطروحات والمذاهب'],
    units: [
      {
        id: 'philosophy-u1',
        title: 'منهجية المقالة',
        description: 'المقدمة، العرض، الخاتمة وطرق الاستقصاء.',
        exercises: [
          ex('تحرير مقدمة فلسفية حول قضية الإدراك', 'medium', 30),
          ex('تدريب على الاستقصاء بالرفع', 'hard', 40),
        ],
        cards: [
          {
            front: 'ما هو دور المقدمة في المقالة الفلسفية؟',
            back: 'طرح الموضوع والإشكالية والتمهيد للعرض دون تقديم الإجابة مسبقًا.',
          },
          {
            front: 'ما هو المنهج الجدلي؟',
            back: 'أطروحة ← نقيضها ← تركيب، يُظهر تطور الفكرة بدل عرضها بشكل أحادي.',
          },
          {
            front: 'ما هي الاستقصاء بالوضع والرفع؟',
            back: 'بالوضع: الدفاع عن أطروحة بالأدلة. بالرفع: إبطال أطروحة وإثبات نقيضها.',
          },
        ],
      },
    ],
    series: [
      {
        title: 'مقالات جاهزة للنقاش — فلسفة',
        description: 'نماذج مقالات مع شبكات تفكير لتدريب البناء المنهجي.',
        items: 8,
        minutes: 120,
      },
    ],
  },
  {
    id: 'history',
    slug: 'history',
    name: 'التاريخ والجغرافيا',
    shortName: 'تاريخ',
    description: 'الثورة التحريرية، العلاقات الدولية والمفاهيم الجغرافية الأساسية.',
    color: '#8A6A34',
    icon: 'scroll',
    coefficient: 2,
    durationMinutes: 120,
    topics: ['الثورة التحريرية', 'العلاقات الدولية', 'الجغرافيا الاقتصادية'],
    units: [
      {
        id: 'history-u1',
        title: 'الثورة التحريرية الجزائرية',
        description: 'بوادر المقاومة، اندلاع الثورة ومؤسساتها، ثم الاستقلال.',
        exercises: [
          ex('تحليل وثيقة تاريخية حول مؤتمر الصومام', 'medium', 30),
          ex('بناء جدولة زمنية للثورة الجزائرية', 'easy', 20),
        ],
        cards: [
          {
            front: 'متى اندلعت الثورة التحريرية الجزائرية؟',
            back: 'في 1 نوفمبر 1954، بالهجوم على عدة ثكنات ومواقع استعمارية في اليوم نفسه.',
          },
          {
            front: 'متى انعقد مؤتمر الصومام وما نتائجه؟',
            back: 'في 20 أوت 1956؛ نظّم المؤسسات السياسية والعسكرية وحدّد استراتيجية العمل.',
          },
          {
            front: 'متى استقلت الجزائر؟',
            back: 'في 5 جويلية 1962، بعد توقيع اتفاقيات إيفيان في 18 مارس 1962.',
          },
        ],
      },
      {
        id: 'history-u2',
        title: 'العالم بعد 1945',
        description: 'الحرب الباردة، الاستقطاب الثنائي والتحولات الاقتصادية.',
        exercises: [
          ex('مقارنة بين النموذجين الرأسمالي والاشتراكي', 'medium', 25),
          ex('قراءة خريطة الاستقطاب الثنائي', 'easy', 15),
        ],
        cards: [
          {
            front: 'ما هي الحرب الباردة؟',
            back: 'صراع غير مباشر بين الولايات المتحدة والاتحاد السوفيتي امتد من 1947 إلى 1991 دون مواجهة عسكرية مباشرة.',
          },
          {
            front: 'ما هو مبدأ ترومان؟',
            back: 'سياسة أمريكية (1947) تهدف إلى احتواء الشيوعية عبر المساعدات الاقتصادية والعسكرية.',
          },
          {
            front: 'ما هي حركة عدم الانحياز؟',
            back: 'حركة تأسست سنة 1961 لدول ترفض الانضمام إلى أي من القطبين خلال الحرب الباردة.',
          },
        ],
      },
    ],
    series: [
      {
        title: 'الجدول الزمني المكثّف للبكالوريا',
        description: 'كل التواريخ والشخصيات الأساسية في بطاقات مراجعة سريعة.',
        items: 40,
        minutes: 60,
      },
    ],
  },
  {
    id: 'islamic',
    slug: 'islamic',
    name: 'العلوم الإسلامية',
    shortName: 'علوم إسلامية',
    description: 'العقيدة، الفقه والسيرة على ضوء البرنامج الرسمي للسنة الثالثة ثانوي.',
    color: '#2C7A6B',
    icon: 'book',
    coefficient: 2,
    durationMinutes: 90,
    topics: ['العقيدة', 'الفقه', 'القرآن والحديث'],
    units: [
      {
        id: 'islamic-u1',
        title: 'العقيدة والتوحيد',
        description: 'أقسام التوحيد، الإيمان ومراتبه، والأخلاق الإسلامية.',
        exercises: [
          ex('شرح أقسام التوحيد مع الأمثلة', 'easy', 20),
          ex('تحليل نص قرآني حول الإيمان', 'medium', 25),
        ],
        cards: [
          {
            front: 'ما هي أقسام التوحيد؟',
            back: 'توحيد الربوبية، توحيد الألوهية، وتوحيد الأسماء والصفات.',
          },
          {
            front: 'ما هي أركان الإسلام؟',
            back: 'الشهادتان، الصلاة، الزكاة، صوم رمضان، وحج بيت الله لمن استطاع.',
          },
          {
            front: 'ما هو تعريف العقيدة؟',
            back: 'الإيمان الجازم بالله وملائكته وكتبه ورسله واليوم الآخر والقدر خيره وشره.',
          },
        ],
      },
      {
        id: 'islamic-u2',
        title: 'الفقه وأحكام الأسرة',
        description: 'الزواج، الطلاق، الميراث وأحكام المعاملات.',
        exercises: [
          ex('تطبيق عملي على أحكام الميراث', 'hard', 30),
          ex('دراسة حالة فقهية حول العقود', 'medium', 25),
        ],
        cards: [
          {
            front: 'ما هي شروط صحة الزواج في الشريعة؟',
            back: 'الرضا، الولي، الشاهدان، الصداق، وخلوّ الزوجين من الموانع الشرعية.',
          },
          {
            front: 'ما هو نصاب زكاة المال؟',
            back: 'ما يعادل 85 غرامًا من الذهب، وتُؤدى بنسبة 2.5% بعد مرور الحول.',
          },
        ],
      },
    ],
    series: [
      {
        title: 'مراجعة الأحكام الفقهية',
        description: 'ملخصات وبطاقات للمصطلحات والأحكام الأكثر تكرارًا في الامتحان.',
        items: 25,
        minutes: 45,
      },
    ],
  },
];
