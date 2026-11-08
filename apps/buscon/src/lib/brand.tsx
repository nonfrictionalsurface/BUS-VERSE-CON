import React from 'react';
import { cn } from './utils/cn';

export function BusConReveal({ size = 400, className }: { size?: number, className?: string }) {
  return (
    <div className={cn("reveal-animating", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 1254 1254" width="100%" height="100%">
        <defs>
          <linearGradient id="sheenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className="bv-road" style={{ fill: 'var(--brand)' }}>
          <path fillRule="evenodd" d="M 332,609 L 332,627 L 340,645 L 360,667 L 392,690 L 433,712 L 471,728 L 504,739 L 554,752 L 595,759 L 634,763 L 721,764 L 765,760 L 818,752 L 865,741 L 888,733 L 702,690 L 570,652 L 493,623 L 460,605 L 444,590 L 440,580 L 441,572 L 445,565 L 455,556 L 474,546 L 496,538 L 555,523 L 517,526 L 474,533 L 435,543 L 404,554 L 372,569 L 353,581 L 338,596 Z M 576,718 L 596,707 L 698,735 L 685,743 L 674,747 L 603,728 Z M 458,673 L 471,666 L 479,664 L 548,693 L 527,704 L 485,687 Z M 392,624 L 409,619 L 421,631 L 448,648 L 427,656 L 410,644 Z M 402,580 L 404,582 L 399,595 L 401,606 L 387,610 L 385,605 L 387,594 L 397,580 Z" />
        </g>

        <g className="bv-bus">
          <g style={{ fill: 'var(--text-bright)' }}>
            <path fillRule="evenodd" d="M 972,626 L 971,590 L 966,571 L 958,554 L 945,536 L 935,526 L 909,508 L 888,498 L 889,485 L 886,464 L 879,455 L 870,452 L 853,452 L 855,463 L 866,463 L 871,467 L 873,472 L 874,494 L 861,492 L 868,552 L 868,594 L 863,610 L 851,619 L 624,620 L 621,588 L 616,570 L 606,556 L 595,551 L 581,553 L 570,564 L 564,579 L 561,609 L 511,605 L 535,617 L 568,630 L 593,638 L 625,645 L 778,645 L 797,639 L 809,632 L 842,632 L 842,637 L 836,649 L 828,659 L 818,668 L 802,677 L 776,684 L 727,685 L 898,728 L 919,716 L 932,706 L 947,690 L 963,662 Z M 587,571 L 593,571 L 600,576 L 607,592 L 608,606 L 606,618 L 601,628 L 593,634 L 586,634 L 579,628 L 573,613 L 574,589 L 580,576 Z" />
          </g>
          <g style={{ fill: 'var(--text-bright)' }}>
            <path fillRule="evenodd" d="M 857,563 L 830,573 L 825,578 L 819,595 L 822,597 L 850,594 L 856,586 Z M 845,576 L 846,582 L 843,587 L 832,590 L 830,588 L 835,579 Z M 683,560 L 686,580 L 689,588 L 694,593 L 717,596 L 740,596 L 742,594 L 737,581 L 729,571 L 705,563 L 687,559 Z M 707,576 L 709,574 L 714,574 L 722,577 L 725,580 L 727,587 L 714,587 L 708,581 Z M 444,467 L 426,472 L 418,478 L 412,498 L 410,517 L 440,512 Z M 491,453 L 450,465 L 446,511 L 487,506 Z M 651,412 L 647,408 L 638,407 L 499,450 L 497,455 L 493,505 L 592,493 L 595,453 L 597,448 L 602,498 L 606,506 L 613,512 L 664,542 L 658,448 L 655,424 Z M 662,401 L 668,414 L 672,436 L 683,436 L 694,440 L 700,446 L 704,458 L 705,491 L 700,496 L 692,496 L 687,491 L 684,453 L 679,450 L 673,451 L 680,526 L 686,533 L 716,542 L 753,546 L 824,546 L 841,544 L 855,539 L 851,501 L 844,462 L 835,432 L 827,420 L 800,411 L 752,403 L 698,398 L 673,398 Z M 883,280 L 863,257 L 847,246 L 821,235 L 784,227 L 745,225 L 361,226 L 406,298 L 379,557 L 392,551 L 403,485 L 410,467 L 419,458 L 642,384 L 679,381 L 722,383 L 768,389 L 809,398 L 824,403 L 838,415 L 843,423 L 850,444 L 865,429 L 876,413 L 885,395 L 893,370 L 896,352 L 896,319 L 893,304 Z M 499,414 L 508,317 L 511,309 L 752,309 L 772,314 L 780,319 L 787,326 L 792,337 L 793,361 L 789,374 L 784,381 L 749,374 L 712,370 L 678,369 L 644,371 L 601,381 L 502,415 Z" />
          </g>
        </g>

        <ellipse className="bv-shockwave" cx="980" cy="547" rx="65" ry="24" fill="none" style={{ stroke: 'var(--brand)' }} strokeWidth="4" opacity="0" />

        <g className="bv-pin" style={{ fill: 'var(--brand)' }}>
          <path fillRule="evenodd" d="M 987,375 L 966,377 L 941,389 L 924,408 L 916,430 L 916,451 L 924,474 L 980,547 L 1037,476 L 1043,464 L 1048,444 L 1045,419 L 1035,400 L 1023,388 L 1003,378 Z M 972,409 L 984,408 L 999,413 L 1009,423 L 1013,432 L 1014,444 L 1011,455 L 1002,466 L 988,473 L 973,473 L 964,469 L 954,460 L 949,450 L 948,438 L 953,423 L 965,412 Z" />
        </g>

        <g style={{ fill: 'var(--text-bright)' }}>
          <g transform="translate(121,0)">
            <path className="bv-char char-1" fillRule="evenodd" d="M 128,833 L 107,990 L 216,990 L 229,987 L 246,978 L 256,967 L 263,947 L 263,930 L 257,916 L 244,906 L 256,896 L 264,879 L 264,859 L 257,845 L 248,838 L 230,833 Z M 152,959 L 157,925 L 210,925 L 216,928 L 220,934 L 219,947 L 213,955 L 206,959 Z M 159,895 L 162,871 L 165,864 L 213,864 L 220,867 L 223,872 L 223,883 L 220,889 L 212,895 L 164,897 Z" />
          </g>
          <g transform="translate(127,0)">
            <path className="bv-char char-2" fillRule="evenodd" d="M 282,882 L 272,952 L 273,969 L 278,980 L 286,987 L 297,991 L 343,992 L 362,987 L 375,978 L 385,962 L 388,951 L 397,882 L 360,882 L 350,951 L 343,961 L 333,964 L 317,963 L 310,956 L 319,883 Z" />
          </g>
          <g transform="translate(144,0)">
            <path className="bv-char char-3" fillRule="evenodd" d="M 514,881 L 437,881 L 425,884 L 416,889 L 406,902 L 403,912 L 403,927 L 407,936 L 415,943 L 426,947 L 468,948 L 472,951 L 472,957 L 469,961 L 464,963 L 398,963 L 394,990 L 470,990 L 489,986 L 504,977 L 509,971 L 514,957 L 513,942 L 509,934 L 500,927 L 489,923 L 447,922 L 442,918 L 442,914 L 448,908 L 510,908 Z" />
          </g>
        </g>

        <g style={{ fill: 'var(--brand)' }}>
          <path className="bv-char char-4" fillRule="evenodd" d="M 795.1,970.4 A 55,55 0 1 1 795.1,899.6 L 773.7,917.6 A 27,27 0 1 0 773.7,952.4 Z" />
          <path className="bv-char char-5" fillRule="evenodd" d="M 864,880 A 55,55 0 1 1 864,990 A 55,55 0 1 1 864,880 Z M 864,908 A 27,27 0 1 1 864,962 A 27,27 0 1 1 864,908 Z" />
          <path className="bv-char char-6" fillRule="evenodd" d="M 933,880 L 963,880 L 1003,990 L 1033,990 L 1033,880 L 1003,880 L 963,990 L 933,990 Z" />
        </g>

        <rect className="bv-sheen" x="200" y="100" width="300" height="1100" fill="url(#sheenGrad)" opacity="0" />
      </svg>
    </div>
  );
}

export function TransitLoader({ caption = "LOADING...", size = "md" }: { caption?: string, size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: 160, md: 240, lg: 320 };
  const w = sizes[size];
  const h = w * (500 / 800);

  return (
    <div className={cn("loader-animating flex flex-col items-center justify-center", size === 'sm' ? 'gap-1' : 'gap-4')} style={{ width: w }}>
      <svg viewBox="0 0 800 500" width="100%" height="100%">
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#B07070" />
            <stop offset="50%" stopColor="#C48787" />
            <stop offset="100%" stopColor="#DBA5A5" />
          </linearGradient>
          <linearGradient id="roofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2E2620" />
            <stop offset="100%" stopColor="#1A1410" />
          </linearGradient>
          <linearGradient id="glassGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#3D2E22" />
            <stop offset="50%" stopColor="#2E2620" />
            <stop offset="100%" stopColor="#1A1410" />
          </linearGradient>
          <linearGradient id="glassSheen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F5E6E6" stopOpacity="0" />
            <stop offset="50%" stopColor="#F5E6E6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="headlightBeam" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#C48787" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#C48787" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#B07070" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="underglowGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C48787" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#B07070" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#B07070" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="taillightGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF2A55" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF2A55" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3D2E22" />
            <stop offset="50%" stopColor="#1A1410" />
            <stop offset="100%" stopColor="#4A3F36" />
          </linearGradient>
        </defs>

        <g className="wind-streak-group" strokeWidth="2" strokeLinecap="round" fill="none">
          <line className="wind-streak ws-d1" x1="560" y1="135" x2="680" y2="135" strokeDasharray="70 50" />
          <line className="wind-streak ws-d2" x1="500" y1="168" x2="660" y2="168" strokeDasharray="90 60" />
          <line className="wind-streak ws-d3" x1="540" y1="305" x2="700" y2="305" strokeDasharray="60 40" />
        </g>

        <g>
          <rect className="loader-ground-bar" x="0" y="340" width="800" height="4" />
          <line className="loader-road-dash" x1="-100" y1="358" x2="900" y2="358" stroke="#C48787" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
          <line className="loader-road-edge" x1="-100" y1="372" x2="900" y2="372" stroke="#DBA5A5" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
        </g>

        <ellipse className="loader-underglow-fx" cx="400" cy="336" rx="210" ry="14" fill="url(#underglowGrad)" opacity="0.7" />
        <ellipse cx="205" cy="275" rx="40" ry="18" fill="url(#taillightGlow)" opacity="0.7" />
        <polygon className="loader-headlight-poly" points="596,275 800,225 800,352 602,305" fill="url(#headlightBeam)" opacity="0.9" />

        <g id="bus-chassis-rig">
          <path d="M 290,165 Q 310,154 360,154 L 465,154 Q 505,154 520,165 Z" fill="url(#roofGrad)" />
          <rect x="340" y="159" width="30" height="3" rx="1.5" fill="#2E2620" />
          <rect x="385" y="159" width="30" height="3" rx="1.5" fill="#2E2620" />
          <rect x="430" y="159" width="30" height="3" rx="1.5" fill="#2E2620" />

          <path d="M 215,178 Q 210,178 208,186 L 204,295 Q 204,310 218,310 L 255,310 A 38,38 0 0 1 331,310 L 477,310 A 38,38 0 0 1 553,310 L 588,310 Q 605,310 605,296 L 603,260 Q 601,230 582,198 L 568,184 Q 556,178 538,178 Z" fill="url(#bodyGrad)" />
          <path d="M 204,290 L 204,298 Q 204,310 218,310 L 255,310 A 38,38 0 0 1 331,310 L 477,310 A 38,38 0 0 1 553,310 L 588,310 Q 605,310 605,296 L 604,290 Z" fill="#1A1410" />
          <path d="M 204,286 L 254,286 A 38,38 0 0 1 332,286 L 476,286 A 38,38 0 0 1 554,286 L 602,286" fill="none" stroke="#F5E6E6" strokeWidth="2" opacity="0.85" />

          <path d="M 220,188 L 535,188 Q 552,188 563,200 L 579,222 Q 586,232 588,246 L 589,252 L 220,252 Z" fill="url(#glassGrad)" stroke="#1A1410" strokeWidth="2" />
          <path d="M 280,252 L 325,188 L 350,188 L 305,252 Z" fill="url(#glassSheen)" />
          <path d="M 440,252 L 485,188 L 500,188 L 455,252 Z" fill="url(#glassSheen)" opacity="0.5" />

          <line x1="275" y1="188" x2="275" y2="252" stroke="#1A1410" strokeWidth="3" />
          <line x1="340" y1="188" x2="340" y2="252" stroke="#1A1410" strokeWidth="3" />
          <line x1="410" y1="188" x2="410" y2="252" stroke="#1A1410" strokeWidth="3" />
          <line x1="480" y1="188" x2="480" y2="252" stroke="#1A1410" strokeWidth="3" />

          <ellipse cx="600" cy="276" rx="4" ry="5" fill="#C48787" />
          <rect x="202" y="262" width="3" height="20" rx="1.5" fill="#FFA3B2" />

          <g>
            <path d="M 258,310 A 35,35 0 0 1 328,310 Z" fill="#0F0B08" />
            <circle cx="293" cy="310" r="28" fill="#1A1410" stroke="#0F0B08" strokeWidth="2" />
            <g className="loader-wheel">
              <circle cx="293" cy="310" r="19" fill="url(#rimGrad)" />
              <circle cx="293" cy="310" r="13" fill="none" stroke="#C48787" strokeWidth="2" strokeDasharray="6 7" />
              <circle cx="293" cy="310" r="5" fill="#B07070" />
            </g>
          </g>

          <g>
            <path d="M 480,310 A 35,35 0 0 1 550,310 Z" fill="#0F0B08" />
            <circle cx="515" cy="310" r="28" fill="#1A1410" stroke="#0F0B08" strokeWidth="2" />
            <g className="loader-wheel">
              <circle cx="515" cy="310" r="19" fill="url(#rimGrad)" />
              <circle cx="515" cy="310" r="13" fill="none" stroke="#C48787" strokeWidth="2" strokeDasharray="6 7" />
              <circle cx="515" cy="310" r="5" fill="#B07070" />
            </g>
          </g>
        </g>

        <g transform="translate(400, 435)">
          <text className="loader-status-text" textAnchor="middle" fontFamily="-apple-system, sans-serif" fontSize="14" fontWeight="700" letterSpacing="6">
            {caption}
            <tspan className="loading-dot-1">.</tspan>
            <tspan className="loading-dot-2">.</tspan>
            <tspan className="loading-dot-3">.</tspan>
          </text>
        </g>
      </svg>
    </div>
  );
}
