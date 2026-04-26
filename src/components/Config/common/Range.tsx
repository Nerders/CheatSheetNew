import { InputHTMLAttributes } from 'react'

const Range = (props: InputHTMLAttributes<HTMLInputElement>) => {
  return <input type='range' className='range range-xs range-info w-full' {...props} />
}

export default Range