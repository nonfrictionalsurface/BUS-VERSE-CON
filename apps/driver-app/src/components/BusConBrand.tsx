import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const BRAND_PATHS = {
  roadSwoosh: 'M 332,609 L 332,627 L 340,645 L 360,667 L 392,690 L 433,712 L 471,728 L 504,739 L 554,752 L 595,759 L 634,763 L 721,764 L 765,760 L 818,752 L 865,741 L 888,733 L 702,690 L 570,652 L 493,623 L 460,605 L 444,590 L 440,580 L 441,572 L 445,565 L 455,556 L 474,546 L 496,538 L 555,523 L 517,526 L 474,533 L 435,543 L 404,554 L 372,569 L 353,581 L 338,596 Z M 576,718 L 596,707 L 698,735 L 685,743 L 674,747 L 603,728 Z M 458,673 L 471,666 L 479,664 L 548,693 L 527,704 L 485,687 Z M 392,624 L 409,619 L 421,631 L 448,648 L 427,656 L 410,644 Z M 402,580 L 404,582 L 399,595 L 401,606 L 387,610 L 385,605 L 387,594 L 397,580 Z',
  busShadow: 'M 972,626 L 971,590 L 966,571 L 958,554 L 945,536 L 935,526 L 909,508 L 888,498 L 889,485 L 886,464 L 879,455 L 870,452 L 853,452 L 855,463 L 866,463 L 871,467 L 873,472 L 874,494 L 861,492 L 868,552 L 868,594 L 863,610 L 851,619 L 624,620 L 621,588 L 616,570 L 606,556 L 595,551 L 581,553 L 570,564 L 564,579 L 561,609 L 511,605 L 535,617 L 568,630 L 593,638 L 625,645 L 778,645 L 797,639 L 809,632 L 842,632 L 842,637 L 836,649 L 828,659 L 818,668 L 802,677 L 776,684 L 727,685 L 898,728 L 919,716 L 932,706 L 947,690 L 963,662 Z M 587,571 L 593,571 L 600,576 L 607,592 L 608,606 L 606,618 L 601,628 L 593,634 L 586,634 L 579,628 L 573,613 L 574,589 L 580,576 Z',
  busDetail: 'M 857,563 L 830,573 L 825,578 L 819,595 L 822,597 L 850,594 L 856,586 Z M 845,576 L 846,582 L 843,587 L 832,590 L 830,588 L 835,579 Z M 683,560 L 686,580 L 689,588 L 694,593 L 717,596 L 740,596 L 742,594 L 737,581 L 729,571 L 705,563 L 687,559 Z M 707,576 L 709,574 L 714,574 L 722,577 L 725,580 L 727,587 L 714,587 L 708,581 Z M 444,467 L 426,472 L 418,478 L 412,498 L 410,517 L 440,512 Z M 491,453 L 450,465 L 446,511 L 487,506 Z M 651,412 L 647,408 L 638,407 L 499,450 L 497,455 L 493,505 L 592,493 L 595,453 L 597,448 L 602,498 L 606,506 L 613,512 L 664,542 L 658,448 L 655,424 Z M 662,401 L 668,414 L 672,436 L 683,436 L 694,440 L 700,446 L 704,458 L 705,491 L 700,496 L 692,496 L 687,491 L 684,453 L 679,450 L 673,451 L 680,526 L 686,533 L 716,542 L 753,546 L 824,546 L 841,544 L 855,539 L 851,501 L 844,462 L 835,432 L 827,420 L 800,411 L 752,403 L 698,398 L 673,398 Z M 883,280 L 863,257 L 847,246 L 821,235 L 784,227 L 745,225 L 361,226 L 406,298 L 379,557 L 392,551 L 403,485 L 410,467 L 419,458 L 642,384 L 679,381 L 722,383 L 768,389 L 809,398 L 824,403 L 838,415 L 843,423 L 850,444 L 865,429 L 876,413 L 885,395 L 893,370 L 896,352 L 896,319 L 893,304 Z M 499,414 L 508,317 L 511,309 L 752,309 L 772,314 L 780,319 L 787,326 L 792,337 L 793,361 L 789,374 L 784,381 L 749,374 L 712,370 L 678,369 L 644,371 L 601,381 L 502,415 Z',
  locationPin: 'M 987,375 L 966,377 L 941,389 L 924,408 L 916,430 L 916,451 L 924,474 L 980,547 L 1037,476 L 1043,464 L 1048,444 L 1045,419 L 1035,400 L 1023,388 L 1003,378 Z M 972,409 L 984,408 L 999,413 L 1009,423 L 1013,432 L 1014,444 L 1011,455 L 1002,466 L 988,473 L 973,473 L 964,469 L 954,460 L 949,450 L 948,438 L 953,423 L 965,412 Z',
};

export function BusConLogo({ size = 32 }: { size?: number }) {
  if (Platform.OS === 'web') {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <svg viewBox="320 220 740 560" width={size} height={(size * 560) / 740}>
          <path d={BRAND_PATHS.roadSwoosh} fill="#10B981" fillRule="evenodd" />
          <path d={BRAND_PATHS.busShadow} fill="#E7FBEE" fillRule="evenodd" />
          <path d={BRAND_PATHS.busDetail} fill="#D1FAE5" fillRule="evenodd" />
          <path d={BRAND_PATHS.locationPin} fill="#10B981" fillRule="evenodd" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#F0FDF4', fontSize: 13, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 1.5 }}>
            BUS<span style={{ color: '#10B981' }}>CON</span>
          </span>
          <span style={{ color: '#689F88', fontSize: 8.5, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>
            DISPATCH TERMINAL
          </span>
        </div>
      </div>
    );
  }

  return (
    <View style={styles.nativeLogoRow}>
      <View style={[styles.markBox, { width: size, height: size }]}>
        <Ionicons name="bus" size={size * 0.55} color="#10B981" />
      </View>
      <View>
        <Text style={styles.nativeLogoText}>
          BUS<Text style={{ color: '#10B981' }}>CON</Text>
        </Text>
        <Text style={styles.nativeLogoSub}>DISPATCH TERMINAL</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  markBox: {
    backgroundColor: '#07160F',
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeLogoText: { color: '#F0FDF4', fontSize: 13, fontWeight: '900', fontFamily: 'monospace', letterSpacing: 1.5 },
  nativeLogoSub: { color: '#689F88', fontSize: 8.5, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 1 },
});