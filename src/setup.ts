import Lodash from 'lodash'
import { Functions, type FunctionsType } from '@root/variable'

export const setupEnvironment = ({ Time, Animation }: Partial<FunctionsType>) => {
  if (Time) Functions.Time = Lodash.merge(Functions.Time, Time)
  if (Animation) Functions.Animation = Lodash.merge(Functions.Animation, Animation)
}
