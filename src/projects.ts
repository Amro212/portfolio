export interface Project {
  title: string;
  year: string;
  tags: string[];
  description: string;
  link?: string;
  category: 'hardware' | 'software' | 'research';
}

export const projects: Project[] = [
  {
    title: 'FPGA-Based Signal Processor',
    year: '2025',
    tags: ['VHDL', 'Xilinx Vivado', 'DSP', 'FPGA', 'Senior Capstone'],
    description:
      'Senior capstone project designing a real-time digital signal processor on a Xilinx Artix-7 FPGA. Implements FIR/IIR filtering, FFT computation, and adaptive noise cancellation. The design achieves 200 MHz clock speeds with pipelined arithmetic units and uses AXI-Stream interfaces for data flow.',
    category: 'hardware',
  },
  {
    title: 'Custom RISC-V Processor',
    year: '2024',
    tags: ['SystemVerilog', 'Computer Architecture', 'RISC-V', 'Simulation'],
    description:
      'Designed and verified a 5-stage pipelined RISC-V processor supporting the RV32I instruction set. Features include hazard detection and forwarding, branch prediction, and a direct-mapped cache hierarchy. Verified using UVM-based testbenches with over 95% functional coverage.',
    category: 'hardware',
  },
  {
    title: 'Embedded IoT Sensor Network',
    year: '2024',
    tags: ['C/C++', 'STM32', 'MQTT', 'PCB Design', 'Embedded Systems'],
    description:
      'Built a wireless sensor network using STM32 microcontrollers and LoRa radios for environmental monitoring. Designed custom PCBs in KiCad, implemented low-power firmware with FreeRTOS, and created a web dashboard for real-time data visualization using MQTT and WebSockets.',
    link: 'https://github.com',
    category: 'hardware',
  },
  {
    title: 'ML on Edge Devices',
    year: '2023',
    tags: ['TensorFlow Lite', 'Python', 'ARM Cortex-M', 'Quantization', 'AI'],
    description:
      'Deployed convolutional neural networks on resource-constrained ARM Cortex-M4 microcontrollers for real-time image classification. Achieved 8-bit quantization with less than 2% accuracy loss. Optimized inference to run at 30 FPS within 256KB RAM using CMSIS-NN acceleration.',
    category: 'research',
  },
  {
    title: 'Real-Time OS Kernel',
    year: '2023',
    tags: ['C', 'ARM Assembly', 'Operating Systems', 'Scheduling'],
    description:
      'Implemented a preemptive real-time operating system kernel from scratch for ARM Cortex-M processors. Features include priority-based scheduling, mutex/semaphore synchronization, memory protection via MPU, and interrupt-driven I/O. Kernel context switch time under 5 microseconds.',
    category: 'software',
  },
  {
    title: 'PCB: Wireless Charging Module',
    year: '2022',
    tags: ['KiCad', 'Power Electronics', 'PCB Layout', 'Qi Standard'],
    description:
      'Designed a Qi-compliant wireless charging transmitter and receiver module. Schematic and 4-layer PCB layout designed in KiCad with impedance-controlled traces. Achieved 82% power transfer efficiency at 5W output with thermal management through copper pours and thermal vias.',
    category: 'hardware',
  },
  {
    title: 'Compiler for Subset of C',
    year: '2022',
    tags: ['Rust', 'Parsing', 'Code Generation', 'x86 Assembly'],
    description:
      'Built a compiler for a subset of C targeting x86-64 assembly, written in Rust. Implements lexical analysis, recursive descent parsing, AST construction, type checking, and register allocation. Supports functions, pointers, arrays, structs, and control flow with optimization passes.',
    category: 'software',
  },
  {
    title: 'Autonomous Line-Following Robot',
    year: '2021',
    tags: ['Arduino', 'PID Control', 'Sensors', 'Robotics'],
    description:
      'Built an autonomous robot that follows complex line paths using an array of IR reflectance sensors and a tuned PID controller. Won 2nd place in the university robotics competition. Features include intersection detection, speed optimization, and Bluetooth telemetry for real-time tuning.',
    category: 'hardware',
  },
  {
    title: 'Full-Stack Task Manager',
    year: '2021',
    tags: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Web Dev'],
    description:
      'A full-stack productivity application with drag-and-drop Kanban boards, real-time collaboration via WebSockets, and OAuth authentication. Backend uses Express with Prisma ORM, deployed on AWS with CI/CD via GitHub Actions.',
    link: 'https://github.com',
    category: 'software',
  },
  {
    title: 'Matrix Multiplication Accelerator',
    year: '2020',
    tags: ['Verilog', 'FPGA', 'Linear Algebra', 'HLS'],
    description:
      'Designed a systolic array-based matrix multiplication accelerator in Verilog for dense linear algebra workloads. The 8×8 processing element array achieves 12.8 GFLOPS at 100 MHz on a Zynq-7000 SoC, with DMA-driven data transfer from the ARM host processor.',
    category: 'research',
  },
];
