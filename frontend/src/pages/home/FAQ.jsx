import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'
import PublicPageLayout from '../../components/common/PublicPageLayout'

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      question: "How do I book a bus ticket?",
      answer: "You can book a ticket by selecting your route, travel date, and preferred bus schedule. Then choose your seats and complete the payment process."
    },
  
    {
      question: "Can I cancel my booking?",
      answer: "Yes, you can cancel your booking up to 2 hours before departure. Cancellation fees may apply depending on the timing."
    },
    {
      question: "How do I check in for my trip?",
      answer: "You can check in using your booking reference number or QR code at the terminal. Online check-in is available 2 hours before departure."
    },
    {
      question: "What if I miss my bus?",
      answer: "Please contact our customer service immediately. We may be able to transfer your ticket to the next available bus, subject to availability and fees."
    },
    
  ]

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <PublicPageLayout>
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl mb-6 shadow-xl transform hover:scale-110 transition-all duration-300">
              <HelpCircle className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Find answers to common questions about our services
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/60 overflow-hidden">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200/60 last:border-b-0">
                <button
                  className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-blue-50/50 transition-all duration-200 group"
                  onClick={() => toggleFAQ(index)}
                >
                  <span className="font-semibold text-gray-900 text-lg pr-4 group-hover:text-blue-700 transition-colors">{faq.question}</span>
                  {openIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500 group-hover:text-blue-600 flex-shrink-0 transition-colors" />
                  )}
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-5 bg-blue-50/30">
                    <p className="text-gray-700 leading-relaxed text-base">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-gray-200/60">
            <p className="text-gray-700 text-lg mb-4">
              Still have questions?
            </p>
            <a 
              href="/contact" 
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Contact our support team
            </a>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  )
}

export default FAQ