import {
  PULSE_WAVE_0,
  PULSE_WAVE_1,
  PULSE_WAVE_2,
  PULSE_WAVE_3,
} from '../constants/apu';
import { bitSet, bitTest } from '../utils';
import { dac } from '../utils/apu';
import type { APU } from './apu';

export class Channel1 {
  sampleIndex = 0;
  volume = 0;
  periodCounter = 0;
  outputSample = 0;
  // records time of current iteration
  // when equal to sweepPace, sweep will be triggered
  sweepIterationCounter = 0;
  sweepIterationPace = 0;
  // Envelope states
  envelopeIterationIncrease = false;
  envelopeIterationCounter = 0;
  envelopeIterationPace = 0;
  // length timer
  lengthTimer = 0;

  constructor(private apu: APU) {}

  get enabled(): boolean {
    // NR52
    return bitTest(this.apu.getRegister(0x16), 0);
  }

  get lengthTimerEnabled(): boolean {
    // NR14 bit 6
    return bitTest(this.apu.getRegister(0x04), 6);
  }

  get dacOn(): boolean {
    // NR12 bits 3-7 are all 0, ch1 dac off
    return (this.apu.getRegister(0x12) & 0xf8) !== 0;
  }

  get waveType() {
    // NR11 bits 6-7
    return (this.apu.getRegister(0x01) & 0xc0) >> 6;
  }

  get initialVolume() {
    // NR12 bits 4-7
    return (this.apu.getRegister(0x02) & 0xf0) >> 4;
  }

  get period() {
    // NR13 + NR14 bits 0-2
    return (
      this.apu.getRegister(0x03) + ((this.apu.getRegister(0x04) & 0x07) << 8)
    );
  }

  get sweepPace() {
    // NR10 bits 4-6
    return (this.apu.getRegister(0x00) & 0x70) >> 4;
  }

  get sweepSubtraction() {
    // NR10 bit 3
    return bitTest(this.apu.getRegister(0x00), 3);
  }

  get sweepIndividualStep() {
    // NR10 bits 0-2
    return this.apu.getRegister(0x00) & 0x07;
  }

  get envelopePace() {
    // NR12 bits 0-2
    return this.apu.getRegister(0x02) & 0x07;
  }

  get envelopeIncrease() {
    // NR12 bit 3
    return bitTest(this.apu.getRegister(0x02), 3);
  }

  get initialLengthTimer() {
    // NR11 bits 0-5
    return this.apu.getRegister(0x01) & 0x3f;
  }

  setPeriod(value: number) {
    // nr13
    this.apu.setRegister(0x03, value & 0xff);
    // nr14
    this.apu.setRegister(
      0x04,
      (this.apu.getRegister(0x04) & 0xf8) + ((value >> 8) & 0x07),
    );
  }

  enable() {
    // NR52
    this.apu.setRegister(0x16, bitSet(this.apu.getRegister(0x16), 0, true));

    this.sampleIndex = 0;
    this.volume = this.initialVolume;
    this.periodCounter = this.period;
    this.sweepIterationCounter = 0;
    this.sweepIterationPace = this.sweepPace;
    this.envelopeIterationIncrease = this.envelopeIncrease;
    this.envelopeIterationPace = this.envelopePace;
    this.envelopeIterationCounter = 0;
    this.lengthTimer = this.initialLengthTimer;
  }

  disable() {
    this.apu.setRegister(0x16, bitSet(this.apu.getRegister(0x16), 0, false));
  }

  tick() {
    if (!this.dacOn) {
      this.disable();
      return;
    }
    this.periodCounter++;
    // greater than or equal to 2048
    if (this.periodCounter >= 0x800) {
      // advance next sample
      this.sampleIndex = (this.sampleIndex + 1) % 8;
      this.periodCounter = this.period;
    }
    let sample = 0;
    switch (this.waveType) {
      case 0:
        sample = PULSE_WAVE_0[this.sampleIndex];
        break;
      case 1:
        sample = PULSE_WAVE_1[this.sampleIndex];
        break;
      case 2:
        sample = PULSE_WAVE_2[this.sampleIndex];
        break;
      case 3:
        sample = PULSE_WAVE_3[this.sampleIndex];
        break;
      default:
        break;
    }
    this.outputSample = dac(sample * this.volume);
  }

  tickLength() {
    if (this.enabled && this.lengthTimerEnabled) {
      this.lengthTimer++;
      if (this.lengthTimer >= 64) {
        this.disable();
      }
    }
  }

  tickSweep() {
    if (this.enabled && this.sweepPace) {
      this.sweepIterationCounter++;
      if (this.sweepIterationCounter === this.sweepIterationPace) {
        let period = this.period;
        let step = this.sweepIndividualStep;

        if (this.sweepSubtraction) {
          period -= period / (1 << step);
        } else {
          period += period / (1 << step);
        }

        if (period > 0x07ff || period <= 0) {
          this.disable();
        } else {
          this.setPeriod(period);
        }

        this.sweepIterationCounter = 0;
        this.sweepIterationPace = this.sweepPace;
      }
    }
  }

  tickEnvelope() {
    if (this.enabled && this.envelopeIterationPace) {
      this.envelopeIterationCounter++;
      if (this.envelopeIterationCounter >= this.envelopeIterationPace) {
        if (this.envelopeIterationIncrease) {
          if (this.volume < 15) {
            this.volume++;
          }
        } else {
          if (this.volume > 0) {
            this.volume--;
          }
        }
      }
      this.envelopeIterationCounter = 0;
    }
  }
}
